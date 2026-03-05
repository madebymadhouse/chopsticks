import { EmbedBuilder, Colors } from "discord.js";

const NO_MENTION = { repliedUser: false };

/**
 * Reply with text OR embed. Handles allowedMentions and errors gracefully.
 * reply(msg, "text") — plain text reply
 * reply(msg, embed) — embed reply
 * reply(msg, { content, embeds, components }) — full options object
 */
export async function reply(message, payload, opts = {}) {
  try {
    if (typeof payload === "string") {
      return await message.reply({ content: payload, allowedMentions: NO_MENTION, ...opts });
    }
    if (payload instanceof EmbedBuilder) {
      return await message.reply({ embeds: [payload], allowedMentions: NO_MENTION, ...opts });
    }
    // Full options object
    return await message.reply({ allowedMentions: NO_MENTION, ...payload, ...opts });
  } catch {
    // Fallback: try channel.send if reply fails (message deleted, etc.)
    try { return await message.channel.send({ content: String(payload?.content ?? payload), allowedMentions: NO_MENTION }); } catch {}
  }
}

/** Reply with a standard error embed */
export async function replyError(message, text) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setDescription(`❌ ${text}`);
  return reply(message, embed);
}

/** Reply with a standard success embed */
export async function replySuccess(message, text) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setDescription(`✅ ${text}`);
  return reply(message, embed);
}

/** Reply with an info/warning embed */
export async function replyInfo(message, text, color = Colors.Blurple) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setDescription(text);
  return reply(message, embed);
}

/** Send a temporary self-deleting reply (auto-deleted after `delayMs`) */
export async function replyTemp(message, text, delayMs = 8000) {
  let sent;
  try {
    sent = await message.reply({ content: text, allowedMentions: NO_MENTION });
  } catch {
    try { sent = await message.channel.send({ content: text, allowedMentions: NO_MENTION }); } catch { return; }
  }
  if (sent) setTimeout(() => sent.delete().catch(() => {}), delayMs);
  return sent;
}

/** DM a user safely */
export async function dm(user, text) {
  try { await user.send(text); } catch {}
}

/** Parse an integer from a string arg, bounded to [min, max]. Returns null if invalid. */
export function parseIntSafe(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const t = Math.trunc(n);
  if (t < min || t > max) return null;
  return t;
}

/** Format milliseconds as a human readable duration string */
export function fmtDuration(ms) {
  if (!ms || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Format a duration in seconds as "2d 3h 4m 5s" */
export function fmtUptime(totalSec) {
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");
}

/** Extract a user ID from a mention or raw ID string */
export function parseUserId(raw) {
  return String(raw || "").replace(/[<@!>]/g, "").trim() || null;
}

/** Extract a role ID from a mention or raw ID string */
export function parseRoleId(raw) {
  return String(raw || "").replace(/[<@&>]/g, "").trim() || null;
}

/** Extract a channel ID from a mention or raw ID string */
export function parseChannelId(raw) {
  return String(raw || "").replace(/[<#>]/g, "").trim() || null;
}

/** Build a simple progress bar */
export function progressBar(value, max, width = 20, filled = "█", empty = "░") {
  if (!max || max <= 0) return empty.repeat(width);
  const f = Math.round(Math.min(1, value / max) * width);
  return filled.repeat(f) + empty.repeat(width - f);
}
