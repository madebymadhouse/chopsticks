// src/lavalink/client.js
import { LavalinkManager } from "lavalink-client";
import { logger } from "../utils/logger.js";

let manager = null;
let rawHooked = false;
let startPromise = null;

// IMPORTANT: Lavalink + Discord voice model = one player per guild (one voice connection per bot per guild).
const ctxByGuild = new Map(); // guildId -> ctx

function ensureRawHook(client) {
  if (rawHooked) return;
  rawHooked = true;

  client.on("raw", d => {
    try {
      manager?.sendRawData(d);
    } catch {}
  });
}

function normalizeSearchQuery(input) {
  const q = String(input ?? "").trim();
  if (!q) return "";
  if (/^https?:\/\//i.test(q)) return q;
  return `ytsearch:${q}`;
}

function bindErrorHandlersOnce() {
  if (!manager) return;
  if (manager.__chopsticksBound) return;
  manager.__chopsticksBound = true;

  try {
    manager.on("error", err => {
      logger.error({ err }, "[lavalink:manager:error]");
    });
  } catch {}

  try {
    manager.nodeManager?.on?.("error", node => {
      logger.error({ node: node?.options?.id ?? "node" }, "[lavalink:node:error]");
    });
  } catch {}

  try {
    manager.nodeManager?.on?.("disconnect", node => {
      logger.warn({ node: node?.options?.id ?? "node" }, "[lavalink:node:disconnect]");
    });
  } catch {}

  try {
    manager.nodeManager?.on?.("reconnecting", node => {
      logger.warn({ node: node?.options?.id ?? "node" }, "[lavalink:node:reconnecting]");
    });
  } catch {}
}

function getPauseFn(player) {
  if (typeof player?.pause === "function") return player.pause.bind(player);
  if (typeof player?.setPaused === "function") return v => player.setPaused(Boolean(v));
  return null;
}

async function setPaused(player, state) {
  const fn = getPauseFn(player);
  if (!fn) throw new Error("player-pause-missing");
  await Promise.resolve(fn(Boolean(state)));
}

async function waitForVoiceReady(player, timeoutMs = 10_000) {
  const startAt = Date.now();
  const hasVoice = () => {
    const v = player?.voice ?? player?.connection ?? player?.player?.voice;
    const token = v?.token ?? player?.voice?.token;
    const endpoint = v?.endpoint ?? player?.voice?.endpoint;
    const sessionId = v?.sessionId ?? player?.voice?.sessionId;
    return Boolean(token && endpoint && sessionId);
  };

  while (Date.now() - startAt < timeoutMs) {
    if (hasVoice()) return true;
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

export function initLavalink(client) {
  if (manager) return manager;
  if (!client?.user?.id) throw new Error("client-not-ready");

  manager = new LavalinkManager({
    nodes: [
      {
        id: "main",
        host: process.env.LAVALINK_HOST || "127.0.0.1",
        port: Number(process.env.LAVALINK_PORT) || 2333,
        authorization: process.env.LAVALINK_PASSWORD || "youshallnotpass"
      }
    ],
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      guild?.shard?.send(payload);
    },
    client: {
      id: client.user.id,
      username: client.user.username
    },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: "ytsearch",
      onDisconnect: { autoReconnect: true, destroyPlayer: false },
      onEmptyQueue: { destroyAfterMs: 300_000 }
    }
  });

  ensureRawHook(client);
  bindErrorHandlersOnce();
  return manager;
}

export async function startLavalink(client) {
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const m = initLavalink(client);
    await m.init({ id: client.user.id, username: client.user.username });
    return m;
  })();

  try {
    return await startPromise;
  } catch (err) {
    startPromise = null;
    throw err;
  }
}

export function getPlayerContext(guildId) {
  return ctxByGuild.get(guildId) ?? null;
}

export function assertOwnership(ctx, userId) {
  if (ctx.ownerId !== userId) throw new Error("not-owner");
}

export function assertSameVoice(ctx, voiceChannelId) {
  if (ctx.voiceChannelId !== voiceChannelId) throw new Error("wrong-voice-channel");
}

export async function createOrGetPlayer({ guildId, voiceChannelId, textChannelId, ownerId }) {
  if (!manager) throw new Error("lavalink-not-ready");

  const existing = ctxByGuild.get(guildId);
  if (existing) return existing;

  const player = manager.createPlayer({
    guildId,
    voiceChannelId,
    textChannelId,
    selfDeaf: true,
    volume: 100
  });

  await player.connect();
  await waitForVoiceReady(player).catch(() => false);

  const ctx = {
    player,
    guildId,
    voiceChannelId,
    textChannelId,
    ownerId,
    lastActive: Date.now()
  };

  ctxByGuild.set(guildId, ctx);
  return ctx;
}

export async function searchOnPlayer(ctx, query, requester) {
  const identifier = normalizeSearchQuery(query);
  if (!identifier) return { tracks: [] };
  if (typeof ctx?.player?.search !== "function") throw new Error("player-search-missing");
  return ctx.player.search({ query: identifier }, requester);
}

export async function playFirst(ctx, track) {
  ctx.lastActive = Date.now();

  const wasIdle = !ctx.player.playing && !(ctx.player.queue?.current);
  await ctx.player.queue.add(track);
  if (!wasIdle) return;

  const okVoice = await waitForVoiceReady(ctx.player);
  if (!okVoice) throw new Error("voice-not-ready");

  try {
    await setPaused(ctx.player, false);
  } catch {}

  await ctx.player.play();

  try {
    await setPaused(ctx.player, false);
  } catch {}
}

export function skip(ctx) {
  ctx.lastActive = Date.now();
  if (typeof ctx.player.skip === "function") ctx.player.skip();
}

export function pause(ctx, state) {
  ctx.lastActive = Date.now();
  void setPaused(ctx.player, state);
}

function bestEffortClearQueue(player) {
  const q = player?.queue;
  if (!q) return;

  if (typeof q.clear === "function") return q.clear();
  if (Array.isArray(q)) return void (q.length = 0);
  if (Array.isArray(q.tracks)) return void (q.tracks.length = 0);
  if (typeof q.splice === "function" && typeof q.length === "number") return void q.splice(0, q.length);
}

export function stop(ctx) {
  ctx.lastActive = Date.now();
  try {
    bestEffortClearQueue(ctx.player);
    if (typeof ctx.player.stop === "function") ctx.player.stop();
  } finally {
    destroy(ctx.guildId);
  }
}

export function destroy(guildId) {
  const ctx = ctxByGuild.get(guildId);
  if (!ctx) return;

  try {
    if (typeof ctx.player.destroy === "function") ctx.player.destroy();
  } catch {}

  ctxByGuild.delete(guildId);
}
