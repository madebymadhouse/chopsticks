// src/tools/auditLog/dispatcher.js
// Central audit log dispatcher — sends formatted embeds to the configured log channel.

import { loadGuildData } from "../../utils/storage.js";

/**
 * Dispatch an audit log embed to the guild's configured log channel for this event type.
 *
 * @param {import("discord.js").Guild} guild
 * @param {string} eventType  — e.g. "messageDelete", "roleCreate"
 * @param {import("discord.js").EmbedBuilder} embed
 */
export async function dispatchAuditLog(guild, eventType, embed) {
  if (!guild) return;
  try {
    const gd = await loadGuildData(guild.id).catch(() => null);
    if (!gd) return;

    // Look for per-event channel first, then fall back to global audit channel
    const channels = gd.auditLog?.channels ?? {};
    const channelId = channels[eventType] ?? channels["*"] ?? gd.modlog?.channelId ?? null;
    if (!channelId) return;

    const channel = guild.channels.cache.get(channelId)
      ?? await guild.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    await channel.send({ embeds: [embed] });
  } catch { /* audit log must never crash the bot */ }
}

/**
 * All supported event type keys.
 */
export const AUDIT_EVENT_TYPES = [
  "messageDelete",
  "messageUpdate",
  "guildMemberUpdate",
  "channelCreate",
  "channelDelete",
  "channelUpdate",
  "roleCreate",
  "roleDelete",
  "roleUpdate",
  "guildBanAdd",
  "guildBanRemove",
  "voiceStateUpdate",
  "guildMemberAdd",
  "guildMemberRemove",
];
