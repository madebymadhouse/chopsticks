/**
 * AudiobookPlayer — stateful per-guild reading session.
 * Uses @discordjs/voice AudioPlayer + createAudioResource.
 * No Lavalink dependency; works standalone.
 */

import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} from '@discordjs/voice';
import { Readable } from 'stream';
import { generateChunk, splitIntoChunks, resolveVoice } from './tts.js';
import { logger } from '../utils/logger.js';

// ── State constants ────────────────────────────────────────────────────────────
export const PlayerState = {
  IDLE:    'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED:  'paused',
  DONE:    'done',
};

const WPM = 150; // assumed reading speed for ETA

// ── Per-guild player registry ─────────────────────────────────────────────────
const players = new Map(); // guildId → AudiobookPlayer

export function getPlayer(guildId) { return players.get(guildId) ?? null; }

export function getOrCreatePlayer(guildId, db) {
  if (!players.has(guildId)) players.set(guildId, new AudiobookPlayer(guildId, db));
  return players.get(guildId);
}

export function destroyPlayer(guildId) {
  players.get(guildId)?.destroy();
  players.delete(guildId);
}

// ── AudiobookPlayer class ─────────────────────────────────────────────────────

export class AudiobookPlayer {
  constructor(guildId, db) {
    this.guildId  = guildId;
    this.db       = db;
    this.state    = PlayerState.IDLE;

    // Session data
    this.session  = null;   // DB session row
    this.book     = null;   // audiobook row
    this.chapters = [];     // all chapter rows ordered by sequence

    // Playback
    this._player  = createAudioPlayer();
    this._conn    = null;   // VoiceConnection
    this._chunkQueue = [];  // pre-generated Buffer chunks for current chapter
    this._chunkIndex = 0;
    this._prefetching = false;

    // Event: track ends → advance
    this._player.on(AudioPlayerStatus.Idle, () => {
      if (this.state === PlayerState.PLAYING) this._advanceChunk();
    });

    this._player.on('error', err => {
      logger.error({ err, guildId }, "[AudiobookPlayer] Player error");
      this._setState(PlayerState.IDLE);
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Load book + chapters from DB, set to chapter 0. */
  async load(session, book, chapters) {
    this.session  = session;
    this.book     = book;
    this.chapters = chapters;
    this._chunkQueue  = [];
    this._chunkIndex  = 0;
    this._setState(PlayerState.IDLE);
  }

  /** Connect to a voice channel and begin reading. */
  async play(connection) {
    if (!this.chapters.length) throw new Error('No book loaded.');
    this._conn = connection;
    connection.subscribe(this._player);

    await entersState(connection, VoiceConnectionStatus.Ready, 5_000).catch(() => {
      throw new Error('Could not connect to voice channel.');
    });

    this._setState(PlayerState.LOADING);
    await this._loadChapter(this.session.current_chapter ?? 0);
    this._playNextChunk();
  }

  pause() {
    if (this.state !== PlayerState.PLAYING) return false;
    this._player.pause();
    this._setState(PlayerState.PAUSED);
    return true;
  }

  resume() {
    if (this.state !== PlayerState.PAUSED) return false;
    this._player.unpause();
    this._setState(PlayerState.PLAYING);
    return true;
  }

  async skipChapter() {
    const next = (this.session?.current_chapter ?? 0) + 1;
    if (next >= this.chapters.length) {
      this._setState(PlayerState.DONE);
      this._player.stop();
      return false;
    }
    this._player.stop(true);
    await this._loadChapter(next);
    this._playNextChunk();
    return true;
  }

  async prevChapter() {
    const prev = Math.max(0, (this.session?.current_chapter ?? 0) - 1);
    this._player.stop(true);
    await this._loadChapter(prev);
    this._playNextChunk();
  }

  async seekChapter(n) {
    const idx = Math.max(0, Math.min(n, this.chapters.length - 1));
    this._player.stop(true);
    await this._loadChapter(idx);
    this._playNextChunk();
  }

  async restartChapter() {
    const idx = this.session?.current_chapter ?? 0;
    this._player.stop(true);
    await this._loadChapter(idx);
    this._playNextChunk();
  }

  destroy() {
    this._player.stop(true);
    this._conn?.destroy();
    this._setState(PlayerState.IDLE);
  }

  /** Progress info for the dashboard. */
  getProgress() {
    if (!this.book || !this.chapters.length) return null;
    const chIdx     = this.session?.current_chapter ?? 0;
    const chapter   = this.chapters[chIdx];
    const wordsLeft = chapter
      ? Math.max(0, chapter.word_count - (this._chunkIndex * 150))
      : 0;
    const etaMin    = Math.ceil(wordsLeft / WPM);
    const pct       = Math.round((chIdx / this.chapters.length) * 100);
    const bar       = buildBar(pct);
    return {
      bookTitle:    this.book.title,
      chapterTitle: chapter?.title ?? 'Unknown',
      chapterIndex: chIdx,
      totalChapters: this.chapters.length,
      percentComplete: pct,
      bar,
      etaMin,
      state: this.state,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _loadChapter(chapterIndex) {
    this._setState(PlayerState.LOADING);
    const chapter = this.chapters[chapterIndex];
    if (!chapter) { this._setState(PlayerState.DONE); return; }

    if (this.session) {
      this.session.current_chapter = chapterIndex;
      await this._saveSession();
    }

    const { id: voiceId, style } = resolveVoice(this.session?.voice_id ?? 'narrator');
    const speed   = parseFloat(this.session?.speed ?? 1.0);
    const rawChunks = splitIntoChunks(chapter.content);

    // Pre-generate all TTS chunks (first one inline, rest in background)
    this._chunkQueue  = [];
    this._chunkIndex  = 0;

    // Generate first chunk inline so playback starts quickly
    const firstBuf = await generateChunk(rawChunks[0], voiceId, speed, style);
    this._chunkQueue.push(firstBuf);

    // Pre-generate chapter title announcement
    const announceBuf = await generateChunk(
      `Chapter ${chapterIndex + 1}: ${chapter.title}`,
      voiceId, speed, style
    ).catch(() => Buffer.alloc(0));
    if (announceBuf.length > 0) this._chunkQueue.unshift(announceBuf);

    // Generate remaining chunks in background
    if (rawChunks.length > 1) {
      this._prefetching = true;
      Promise.all(rawChunks.slice(1).map(c => generateChunk(c, voiceId, speed, style)))
        .then(bufs => { this._chunkQueue.push(...bufs); this._prefetching = false; })
        .catch(() => { this._prefetching = false; });
    }
  }

  _playNextChunk() {
    if (this._chunkIndex >= this._chunkQueue.length && !this._prefetching) {
      // End of chapter — advance
      this._advanceChunk();
      return;
    }
    if (this._chunkIndex >= this._chunkQueue.length) {
      // Still prefetching — wait briefly
      setTimeout(() => this._playNextChunk(), 100);
      return;
    }

    const buf = this._chunkQueue[this._chunkIndex++];
    if (!buf || buf.length === 0) { this._playNextChunk(); return; }

    const resource = createAudioResource(Readable.from(buf), {
      inputType: StreamType.Arbitrary,
    });
    this._setState(PlayerState.PLAYING);
    this._player.play(resource);
  }

  _advanceChunk() {
    if (this._chunkIndex < this._chunkQueue.length) {
      this._playNextChunk();
      return;
    }
    if (this._prefetching) {
      setTimeout(() => this._advanceChunk(), 150);
      return;
    }
    // End of chapter — move to next
    const nextChapter = (this.session?.current_chapter ?? 0) + 1;
    if (nextChapter >= this.chapters.length) {
      this._setState(PlayerState.DONE);
    } else {
      this._loadChapter(nextChapter).then(() => this._playNextChunk());
    }
  }

  async _saveSession() {
    if (!this.db || !this.session) return;
    await this.db.query(
      `UPDATE audiobook_sessions SET current_chapter=$1, state=$2, updated_at=NOW()
       WHERE id=$3`,
      [this.session.current_chapter, this.state, this.session.id]
    );
  }

  _setState(state) {
    this.state = state;
    if (this.session) this.session.state = state;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildBar(pct) {
  const filled = Math.round(pct / 10);
  return '▓'.repeat(filled) + '░'.repeat(10 - filled) + ` ${pct}%`;
}
