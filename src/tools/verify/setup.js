// src/tools/verify/setup.js
// Verification system setup helpers — manage verify config in guild data.

import { ChannelType, PermissionFlagsBits } from "discord.js";
import { loadGuildData, saveGuildData } from "../../utils/storage.js";

export const VERIFY_MODES = ["button", "captcha"];

/**
 * Default verify config.
 */
export function defaultVerifyConfig() {
  return {
    enabled: false,
    mode: "button",           // "button" | "captcha"
    quarantineRoleId: null,   // role given on join (restricted)
    memberRoleId: null,       // role given on verify
    panelChannelId: null,     // channel where the verify panel is posted
    logChannelId: null,       // channel for verify logs
    timeoutHours: 24,         // hours before unverified members are kicked (0 = disabled)
    message: "Click the button below to verify yourself and gain access to the server.",
    dmMessage: null,          // optional DM sent to new members (null = disabled)
  };
}

/**
 * Get (or initialise) verify config for a guild.
 */
export async function getVerifyConfig(guildId) {
  const gd = await loadGuildData(guildId);
  if (!gd.verify) {
    gd.verify = defaultVerifyConfig();
    await saveGuildData(guildId, gd);
  }
  return { gd, verify: gd.verify };
}

/**
 * Ensure a quarantine role exists (creates it if needed).
 * Returns the role.
 */
export async function ensureQuarantineRole(guild) {
  const { verify } = await getVerifyConfig(guild.id);
  if (verify.quarantineRoleId) {
    const existing = guild.roles.cache.get(verify.quarantineRoleId)
      ?? await guild.roles.fetch(verify.quarantineRoleId).catch(() => null);
    if (existing) return existing;
  }

  // Create a new quarantine role
  const role = await guild.roles.create({
    name: "Unverified",
    color: 0x808080,
    reason: "Chopsticks verification system — quarantine role",
    permissions: BigInt(0),
  });

  const gd = await loadGuildData(guild.id);
  gd.verify ??= defaultVerifyConfig();
  gd.verify.quarantineRoleId = role.id;
  await saveGuildData(guild.id, gd);

  return role;
}

/**
 * Restrict the quarantine role from seeing all channels except the verify channel.
 * Grants view access to the verify channel if provided.
 */
export async function applyQuarantinePermissions(guild, quarantineRole, verifyChannelId) {
  // Deny view/send in all channels for the quarantine role
  for (const [, channel] of guild.channels.cache) {
    if (!channel.isTextBased() && channel.type !== ChannelType.GuildCategory) continue;
    if (channel.id === verifyChannelId) continue; // skip the verify channel
    try {
      await channel.permissionOverwrites.edit(quarantineRole, {
        ViewChannel: false,
        SendMessages: false,
      });
    } catch { /* missing permissions — skip */ }
  }

  // Allow the quarantine role to see the verify channel
  if (verifyChannelId) {
    const ch = guild.channels.cache.get(verifyChannelId);
    if (ch) {
      await ch.permissionOverwrites.edit(quarantineRole, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
      }).catch(() => null);
    }
  }
}
