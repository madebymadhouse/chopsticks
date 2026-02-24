// src/tools/verify/handler.js
// Interaction handlers for the verification system (button click, captcha flow).

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags } from "discord.js";
import { loadGuildData, saveGuildData } from "../../utils/storage.js";
import { getVerifyConfig } from "./setup.js";

export const VERIFY_BUTTON_ID = "chopsticks:verify:button";

/**
 * Build the verify panel embed + button component.
 */
export function buildVerifyPanel(config) {
  const embed = new EmbedBuilder()
    .setTitle("Verification Required")
    .setDescription(config.message ?? "Click the button below to verify and gain access.")
    .setColor(0x5865F2)
    .setFooter({ text: "Chopsticks Verification" });

  const button = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel("Verify")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("✅");

  const row = new ActionRowBuilder().addComponents(button);
  return { embeds: [embed], components: [row] };
}

/**
 * Handle a verify button click interaction.
 * - Removes quarantine role
 * - Adds member role
 * - Logs the verification
 */
export async function handleVerifyButton(interaction) {
  if (!interaction.guildId) return;

  await interaction.deferReply({ ephemeral: true });

  const { verify } = await getVerifyConfig(interaction.guildId);
  if (!verify.enabled) {
    return interaction.editReply({ content: "Verification is not enabled on this server." });
  }

  const member = interaction.member;
  if (!member) return interaction.editReply({ content: "Could not find your member record." });

  // Remove quarantine role
  if (verify.quarantineRoleId && member.roles.cache.has(verify.quarantineRoleId)) {
    await member.roles.remove(verify.quarantineRoleId, "Verified via button").catch(() => null);
  }

  // Add member role
  if (verify.memberRoleId) {
    await member.roles.add(verify.memberRoleId, "Verified via button").catch(() => null);
  }

  // Log the verification
  if (verify.logChannelId) {
    try {
      const logCh = interaction.guild.channels.cache.get(verify.logChannelId);
      if (logCh?.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle("Member Verified")
          .setColor(0x57F287)
          .addFields({ name: "Member", value: `<@${member.id}> (${member.user.tag})`, inline: true })
          .setTimestamp()
          .setFooter({ text: `User ID: ${member.id}` });
        await logCh.send({ embeds: [logEmbed] });
      }
    } catch { /* log failure is non-fatal */ }
  }

  await interaction.editReply({ content: "You have been verified! Welcome to the server." });
}

// Pending captcha challenges: userId → { code, guildId, expiresAt }
const pendingCaptcha = new Map();

/**
 * Initiate a captcha challenge — DMs the user a code.
 */
export async function startCaptchaChallenge(member) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min
  pendingCaptcha.set(member.id, { code, guildId: member.guild.id, expiresAt });

  try {
    await member.user.send(
      `**Verification code for ${member.guild.name}:**\n\`\`\`${code}\`\`\`\nType this code in the verification channel. Expires in 10 minutes.`
    );
    return true;
  } catch {
    return false; // DMs closed
  }
}

/**
 * Validate a captcha response from a message in the verify channel.
 * Returns { ok: boolean, reason?: string }
 */
export async function validateCaptcha(message) {
  const entry = pendingCaptcha.get(message.author.id);
  if (!entry) return { ok: false, reason: "No pending verification. Make sure you joined from the verify channel." };
  if (Date.now() > entry.expiresAt) {
    pendingCaptcha.delete(message.author.id);
    return { ok: false, reason: "Your verification code has expired. Rejoin the server to get a new one." };
  }
  if (entry.guildId !== message.guildId) return { ok: false, reason: "Wrong server." };

  const submitted = message.content.trim().toUpperCase();
  if (submitted !== entry.code) return { ok: false, reason: "Incorrect code. Try again." };

  pendingCaptcha.delete(message.author.id);

  // Apply verification
  const { verify } = await getVerifyConfig(message.guildId);
  const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member) {
    if (verify.quarantineRoleId && member.roles.cache.has(verify.quarantineRoleId)) {
      await member.roles.remove(verify.quarantineRoleId, "Captcha verified").catch(() => null);
    }
    if (verify.memberRoleId) {
      await member.roles.add(verify.memberRoleId, "Captcha verified").catch(() => null);
    }
  }

  return { ok: true };
}
