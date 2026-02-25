// src/commands/heist.js
import { SlashCommandBuilder } from 'discord.js';
import { makeEmbed, Colors } from '../utils/discordOutput.js';
import { addCredits, removeCredits } from '../economy/wallet.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { getPool } from '../utils/storage_pg.js';
import crypto from 'node:crypto';
import { botLogger } from "../utils/modernLogger.js";

export const meta = { category: 'economy', guildOnly: true };

export const data = new SlashCommandBuilder()
  .setName('heist')
  .setDescription('Organize a group heist for big rewards')
  .addSubcommand(sub =>
    sub.setName('start')
      .setDescription('Start a new heist')
      .addStringOption(o =>
        o.setName('target')
          .setDescription('The heist target (bank, casino, vault, …)')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('join')
      .setDescription('Join the active heist')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Show current heist status')
  );

// ── Pure helpers (exported for testing) ──────────────────────────────────────

/**
 * Calculate heist outcome.
 * @param {number} participantCount - total participants (≥1)
 * @param {number} roll             - random number 0–99 (integer)
 * @returns {{ success: boolean, chance: number, prizeEach: number, lossEach: number }}
 */
export function calcHeistOutcome(participantCount, roll) {
  const n       = Math.max(1, participantCount);
  const chance  = Math.min(80, 40 + 5 * (n - 1));
  const success = roll < chance;
  return {
    success,
    chance,
    prizeEach: success ? 200 * n : 0,
    lossEach:  success ? 0       : 50,
  };
}

export function canStartHeist(activeHeist) {
  return !activeHeist || activeHeist.status === 'done';
}

export function canJoinHeist(heist, userId) {
  if (!heist || heist.status !== 'recruiting')           return { ok: false, reason: 'no_active' };
  if (heist.participants.includes(userId))               return { ok: false, reason: 'already_joined' };
  if (heist.participants.length >= 10)                   return { ok: false, reason: 'full' };
  const joinDeadline = new Date(heist.start_time).getTime() + heist.join_window_seconds * 1000;
  if (Date.now() > joinDeadline)                         return { ok: false, reason: 'window_closed' };
  return { ok: true };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function fetchHeist(guildId) {
  const pool = getPool();
  const res  = await pool.query('SELECT data FROM guild_settings WHERE guild_id=$1', [guildId]);
  return res.rows[0]?.data?.activeHeist ?? null;
}

async function persistHeist(guildId, activeHeist) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO guild_settings(guild_id,data,rev) VALUES($1,$2::jsonb,1)
     ON CONFLICT(guild_id) DO UPDATE
       SET data = guild_settings.data || $2::jsonb,
           rev  = guild_settings.rev + 1`,
    [guildId, JSON.stringify({ activeHeist })]
  );
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function execute(interaction) {
  const sub     = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;

  try {
    // ── start ────────────────────────────────────────────────────────────────
    if (sub === 'start') {
      const rl = await checkRateLimit(`heist:start:${guildId}`, 1, 300);
      if (!rl.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Cooldown', `A heist was recently run. Try again in ${rl.resetIn}s.`, [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const target = interaction.options.getString('target');
      const heist  = await fetchHeist(guildId);

      if (!canStartHeist(heist)) {
        return interaction.reply({
          embeds: [makeEmbed('Heist In Progress', 'A heist is already recruiting members!', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const newHeist = {
        id:                 crypto.randomUUID().slice(0, 8),
        target,
        leader:             userId,
        participants:       [userId],
        start_time:         new Date().toISOString(),
        join_window_seconds: 60,
        status:             'recruiting',
      };

      await persistHeist(guildId, newHeist);

      // Auto-resolve after join window
      setTimeout(async () => {
        try {
          const current = await fetchHeist(guildId);
          if (!current || current.id !== newHeist.id || current.status !== 'recruiting') return;

          current.status = 'done';
          await persistHeist(guildId, current);

          const roll    = Math.floor(Math.random() * 100);
          const outcome = calcHeistOutcome(current.participants.length, roll);
          const resultLines = [];

          for (const uid of current.participants) {
            if (outcome.success) {
              await addCredits(uid, outcome.prizeEach, 'heist:win').catch((err) => {
                botLogger.error({ err, uid }, '[heist] addCredits failed for winner');
              });
            } else {
              await removeCredits(uid, outcome.lossEach, 'heist:loss').catch((err) => {
                botLogger.error({ err, uid }, '[heist] removeCredits failed for loser');
              });
            }
            resultLines.push(`<@${uid}>`);
          }
          void (async () => {
            try {
              const { addStat } = await import('../game/activityStats.js');
              for (const uid of current.participants) {
                addStat(uid, interaction.guildId, 'heist_runs', 1);
                if (outcome.success) addStat(uid, interaction.guildId, 'credits_earned', outcome.prizeEach);
              }
            } catch {}
          })();

          const channel = interaction.channel;
          if (channel?.send) {
            await channel.send({
              embeds: [makeEmbed(
                outcome.success ? '💰 Heist Success!' : '🚨 Heist Failed!',
                outcome.success
                  ? `The **${current.target}** heist succeeded! Each participant earned **${outcome.prizeEach}** credits.`
                  : `The **${current.target}** heist failed! Each participant lost **${outcome.lossEach}** credits.`,
                [{ name: 'Participants', value: resultLines.join(', '), inline: false }],
                null, null,
                outcome.success ? Colors.SUCCESS : Colors.ERROR
              )],
            }).catch(() => {});
          }
        } catch (e) {
          botLogger.error({ err: e }, '[heist] auto-resolve error:');
        }
      }, newHeist.join_window_seconds * 1000);

      return interaction.reply({
        embeds: [makeEmbed(
          '🎯 Heist Starting!',
          `<@${userId}> is planning a heist on the **${target}**!\nType \`/heist join\` to join within 60 seconds.`,
          [{ name: 'Heist ID', value: newHeist.id, inline: true }],
          null, null, Colors.WARNING
        )],
      });
    }

    // ── join ─────────────────────────────────────────────────────────────────
    if (sub === 'join') {
      const heist = await fetchHeist(guildId);
      const check = canJoinHeist(heist, userId);

      if (!check.ok) {
        const msgs = {
          no_active:      'There is no active heist to join.',
          already_joined: 'You have already joined this heist!',
          full:           'The heist crew is full (max 10 participants).',
          window_closed:  'The join window has closed.',
        };
        return interaction.reply({
          embeds: [makeEmbed('Cannot Join', msgs[check.reason] ?? 'Cannot join heist.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      heist.participants.push(userId);
      await persistHeist(guildId, heist);

      return interaction.reply({
        embeds: [makeEmbed(
          '✅ Joined Heist!',
          `You joined the heist on **${heist.target}**! (${heist.participants.length} participant${heist.participants.length !== 1 ? 's' : ''})`,
          [], null, null, Colors.SUCCESS
        )],
      });
    }

    // ── status ───────────────────────────────────────────────────────────────
    if (sub === 'status') {
      const heist = await fetchHeist(guildId);

      if (!heist || heist.status === 'done') {
        return interaction.reply({
          embeds: [makeEmbed('No Active Heist', 'No heist is currently in progress.', [], null, null, Colors.INFO)],
        });
      }

      const deadline    = new Date(heist.start_time).getTime() + heist.join_window_seconds * 1000;
      const timeLeft    = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      const chance      = Math.min(80, 40 + 5 * (heist.participants.length - 1));

      return interaction.reply({
        embeds: [makeEmbed(
          `🎯 Heist: ${heist.target}`,
          `Status: **${heist.status === 'recruiting' ? `Recruiting (${timeLeft}s left)` : heist.status}**\nSuccess chance: **${chance}%**`,
          [
            { name: 'Leader',       value: `<@${heist.leader}>`,                   inline: true },
            { name: 'Participants', value: `${heist.participants.length}`,          inline: true },
            { name: 'Crew',         value: heist.participants.map(id => `<@${id}>`).join(', '), inline: false },
          ],
          null, null, Colors.INFO
        )],
      });
    }

  } catch (err) {
    botLogger.error({ err: err }, '[heist] Error:');
    const replied = interaction.replied || interaction.deferred;
    await interaction[replied ? 'editReply' : 'reply']({
      embeds: [makeEmbed('Error', 'An error occurred.', [], null, null, Colors.ERROR)],
      ephemeral: true,
    });
  }
}
