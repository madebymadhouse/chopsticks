/**
 * Embed Component Library — MAP Cycle 2
 * Reusable visual building blocks for Discord embeds.
 * All functions are pure — they return strings/EmbedBuilder additions,
 * not full embeds, so they can compose with any command's existing embed.
 */

import { EmbedBuilder } from "discord.js";
import { Colors } from "./discordOutput.js";

// ── Constants ────────────────────────────────────────────────────────────────

const PROGRESS_FILLED  = "█";
const PROGRESS_EMPTY   = "░";
const DEFAULT_WIDTH    = 10;

// ── progressBar ──────────────────────────────────────────────────────────────

/**
 * Renders a Unicode block progress bar.
 * @param {number} value  - Current value
 * @param {number} max    - Maximum value
 * @param {number} width  - Bar width in characters (default 10)
 * @returns {string}      - e.g. "████░░░░░░ 40%"
 */
export function progressBar(value, max, width = DEFAULT_WIDTH) {
  if (max <= 0) return `${PROGRESS_EMPTY.repeat(width)} 0%`;
  const ratio   = Math.min(Math.max(value / max, 0), 1);
  const filled  = Math.round(ratio * width);
  const empty   = width - filled;
  const pct     = Math.round(ratio * 100);
  return `${PROGRESS_FILLED.repeat(filled)}${PROGRESS_EMPTY.repeat(empty)} ${pct}%`;
}

// ── inventoryGrid ────────────────────────────────────────────────────────────

/**
 * Formats an array of items into a compact grid string.
 * @param {Array<{name: string, qty: number|string, emoji?: string}>} items
 * @param {number} cols - Number of columns (default 2)
 * @returns {string}    - Inline-code-block grid ready for embed description/field
 */
export function inventoryGrid(items, cols = 2) {
  if (!Array.isArray(items) || items.length === 0) return "_Nothing here._";

  const cells = items.map(item => {
    const icon  = item.emoji ? `${item.emoji} ` : "";
    const count = item.qty != null ? ` ×${item.qty}` : "";
    return `${icon}${item.name}${count}`;
  });

  const rows = [];
  for (let i = 0; i < cells.length; i += cols) {
    rows.push(cells.slice(i, i + cols).join("  │  "));
  }
  return rows.join("\n");
}

// ── agentStatusPanel ─────────────────────────────────────────────────────────

/**
 * Builds an EmbedBuilder for an agent pool health panel.
 * @param {Array<{id: string, status: string, podTag?: string, guildId?: string}>} agents
 * @param {number} capacity - Max agents (default 49)
 * @returns {EmbedBuilder}
 */
export function agentStatusPanel(agents, capacity = 49) {
  const active  = agents.filter(a => a.status === "active" || a.status === "ready").length;
  const busy    = agents.filter(a => a.status === "busy").length;
  const idle    = agents.filter(a => a.status === "idle").length;
  const total   = agents.length;

  const bar  = progressBar(total, capacity);
  const rows = agents.slice(0, 10).map(a => {
    const tag    = a.podTag ? `[${a.podTag}]` : "";
    const status = a.status === "busy" ? "🔴" : a.status === "active" || a.status === "ready" ? "🟢" : "🟡";
    return `${status} \`${a.id.slice(0, 8)}\` ${tag}`;
  });
  if (agents.length > 10) rows.push(`_…and ${agents.length - 10} more_`);

  return new EmbedBuilder()
    .setTitle("🤖 Agent Pool Status")
    .setColor(active > 0 ? Colors.Success : Colors.Neutral)
    .setDescription(rows.length ? rows.join("\n") : "_No agents registered._")
    .addFields(
      { name: "Pool Usage", value: bar, inline: false },
      { name: "Active",     value: String(active), inline: true },
      { name: "Busy",       value: String(busy),   inline: true },
      { name: "Idle",       value: String(idle),   inline: true },
    )
    .setFooter({ text: `${total}/${capacity} slots used` });
}

// ── economyCard ──────────────────────────────────────────────────────────────

/**
 * Builds an EmbedBuilder for a compact economy summary.
 * @param {{ wallet: number, bank: number, xp?: number, level?: number, username?: string }} data
 * @returns {EmbedBuilder}
 */
export function economyCard({ wallet = 0, bank = 0, xp = 0, level = null, username = null } = {}) {
  const walletBar = progressBar(wallet, wallet + bank || 1);
  const xpBar     = xp > 0 ? progressBar(xp % 1000, 1000) : null;

  const embed = new EmbedBuilder()
    .setTitle(username ? `💰 ${username}'s Economy` : "💰 Economy Summary")
    .setColor(Colors.Info)
    .addFields(
      { name: "👛 Wallet",  value: `**${wallet.toLocaleString()}** credits\n${walletBar}`, inline: false },
      { name: "🏦 Bank",    value: `**${bank.toLocaleString()}** credits`, inline: true },
      { name: "📊 Net Worth", value: `**${(wallet + bank).toLocaleString()}**`, inline: true },
    );

  if (xp > 0 || level !== null) {
    embed.addFields({
      name:  level !== null ? `⭐ Level ${level}` : "⭐ XP",
      value: xpBar ? `${xp.toLocaleString()} XP\n${xpBar}` : `${xp.toLocaleString()} XP`,
      inline: false,
    });
  }

  return embed;
}

// ── musicNowPlaying ──────────────────────────────────────────────────────────

/**
 * Builds an EmbedBuilder for a music now-playing card.
 * @param {{ title: string, artist?: string, url?: string, thumbnail?: string, duration?: number, position?: number, requestedBy?: string }} track
 * @returns {EmbedBuilder}
 */
export function musicNowPlaying({ title, artist, url, thumbnail, duration = 0, position = 0, requestedBy = null } = {}) {
  const progress = duration > 0 ? progressBar(position, duration) : null;

  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  };

  const embed = new EmbedBuilder()
    .setTitle("🎵 Now Playing")
    .setDescription(url ? `[${title ?? "Unknown"}](${url})` : (title ?? "Unknown"))
    .setColor(Colors.Music ?? Colors.Info);

  if (artist)    embed.addFields({ name: "Artist", value: artist, inline: true });
  if (duration > 0) {
    embed.addFields({
      name:  "Duration",
      value: progress
        ? `${fmtTime(position)} / ${fmtTime(duration)}\n${progress}`
        : fmtTime(duration),
      inline: false,
    });
  }
  if (requestedBy) embed.setFooter({ text: `Requested by ${requestedBy}` });
  if (thumbnail)   embed.setThumbnail(thumbnail);

  return embed;
}
