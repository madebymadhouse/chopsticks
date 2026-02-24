// src/tools/automod/engine.js
// Automod engine — processes a Discord message against configured rules.

import { PermissionFlagsBits } from "discord.js";
import { loadGuildData, saveGuildData } from "../../utils/storage.js";
import { checkRule, ACTIONS, defaultAutomodConfig } from "./rules.js";

// Per-guild in-memory state for duplicate detection
const dupState = new Map(); // guildId → Map<userId, {msgs}>

/**
 * Process a message through the automod engine.
 * Returns null if no rule triggered, or an action descriptor if triggered.
 *
 * @param {import("discord.js").Message} message
 * @returns {Promise<null | { rule: string, reason: string, action: string, automod: object }>}
 */
export async function processAutomod(message) {
  if (!message.guild || message.author?.bot) return null;

  const gd = await loadGuildData(message.guildId).catch(() => null);
  if (!gd) return null;

  const automod = gd.automod;
  if (!automod?.enabled) return null;

  // Check channel exemptions
  if (automod.exemptChannels?.includes(message.channelId)) return null;
  if (message.channel?.parentId && automod.exemptChannels?.includes(message.channel.parentId)) return null;

  // Check role exemptions — skip members with exempt roles or ManageGuild
  try {
    const member = message.member
      ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) {
      if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return null;
      if (automod.exemptRoles?.some(rId => member.roles.cache.has(rId))) return null;
    }
  } catch { /* continue */ }

  const content = message.content ?? "";
  if (!content) return null;

  // Ensure guild dup state map exists
  if (!dupState.has(message.guildId)) dupState.set(message.guildId, new Map());
  const guildState = dupState.get(message.guildId);

  const rules = automod.rules ?? {};
  for (const [type, rule] of Object.entries(rules)) {
    const result = checkRule(content, rule, type, guildState, message.author.id);
    if (result) {
      return {
        rule: type,
        reason: result.reason,
        action: rule.action ?? "delete",
        automod,
      };
    }
  }

  return null;
}

/**
 * Execute the triggered automod action.
 */
export async function enforceAutomod(message, result) {
  const { reason, action, automod } = result;
  const guild = message.guild;

  // 1. Delete the message
  await message.delete().catch(() => null);

  // 2. Apply action
  const member = message.member
    ?? await guild.members.fetch(message.author.id).catch(() => null);

  let dmSent = false;
  if (member) {
    try {
      await message.author.send(
        `> **AutoMod** removed your message in **${guild.name}**.\n> Reason: ${reason}`
      );
      dmSent = true;
    } catch { /* DMs disabled */ }

    try {
      if (action === "timeout") {
        await member.timeout(10 * 60 * 1000, `AutoMod: ${reason}`);
      } else if (action === "kick") {
        await member.kick(`AutoMod: ${reason}`);
      } else if (action === "ban") {
        await member.ban({ deleteMessageSeconds: 0, reason: `AutoMod: ${reason}` });
      } else if (action === "warn") {
        // Warn is just the DM — no further action
      }
      // "delete" — already handled
    } catch { /* missing permissions */ }
  }

  // 3. Log to mod-log channel
  const logChannelId = automod.logChannelId;
  if (logChannelId) {
    try {
      const logChannel = guild.channels.cache.get(logChannelId)
        ?? await guild.channels.fetch(logChannelId).catch(() => null);
      if (logChannel?.isTextBased()) {
        const { EmbedBuilder } = await import("discord.js");
        const embed = new EmbedBuilder()
          .setTitle("AutoMod Violation")
          .setColor(0xED4245)
          .addFields(
            { name: "User", value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
            { name: "Channel", value: `<#${message.channelId}>`, inline: true },
            { name: "Rule", value: result.rule, inline: true },
            { name: "Action", value: action, inline: true },
            { name: "Reason", value: reason },
            { name: "Message Content", value: (message.content ?? "").slice(0, 400) || "(empty)" },
          )
          .setTimestamp()
          .setFooter({ text: `AutoMod • ${guild.name}` });
        await logChannel.send({ embeds: [embed] });
      }
    } catch { /* log channel unavailable */ }
  }
}

/**
 * Get or initialise the automod config for a guild.
 */
export async function getAutomodConfig(guildId) {
  const gd = await loadGuildData(guildId);
  if (!gd.automod) {
    gd.automod = defaultAutomodConfig();
    await saveGuildData(guildId, gd);
  }
  return gd.automod;
}

export { defaultAutomodConfig };
