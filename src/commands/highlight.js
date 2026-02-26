// src/commands/highlight.js
// Keyword highlight system — users get a DM when their tracked keyword
// is mentioned in any message in the server.
// Stored in guildData.highlights: Map<userId, string[]>
// Max 20 keywords per user per guild.

import {
  SlashCommandBuilder,
  MessageFlags,
  EmbedBuilder,
} from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export const meta = {
  deployGlobal: false,
  name: "highlight",
  category: "utility",
};

export const data = new SlashCommandBuilder()
  .setName("highlight")
  .setDescription("Get notified when a keyword is mentioned in this server")

  .addSubcommand(s => s
    .setName("add")
    .setDescription("Add a keyword to highlight")
    .addStringOption(o => o.setName("keyword").setDescription("Word or phrase to track").setRequired(true).setMaxLength(50)))

  .addSubcommand(s => s
    .setName("remove")
    .setDescription("Remove a keyword")
    .addStringOption(o => o.setName("keyword").setDescription("Keyword to remove").setRequired(true).setMaxLength(50)))

  .addSubcommand(s => s
    .setName("list")
    .setDescription("List your highlighted keywords"))

  .addSubcommand(s => s
    .setName("clear")
    .setDescription("Remove all your highlighted keywords"));

function ensureHighlights(gd) {
  gd.highlights ??= {};
  return gd.highlights;
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const gd = await loadGuildData(guildId);
  const hl = ensureHighlights(gd);
  hl[userId] ??= [];

  if (sub === "add") {
    const kw = interaction.options.getString("keyword", true).toLowerCase();
    if (hl[userId].includes(kw)) return interaction.reply({ content: "> You're already tracking that keyword.", flags: MessageFlags.Ephemeral });
    if (hl[userId].length >= 20) return interaction.reply({ content: "> You can track a maximum of 20 keywords per server.", flags: MessageFlags.Ephemeral });
    hl[userId].push(kw);
    await saveGuildData(guildId, gd);
    return interaction.reply({ content: `> Now highlighting \`${kw}\` in this server.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === "remove") {
    const kw = interaction.options.getString("keyword", true).toLowerCase();
    const before = hl[userId].length;
    hl[userId] = hl[userId].filter(k => k !== kw);
    if (hl[userId].length === before) return interaction.reply({ content: "> Keyword not found.", flags: MessageFlags.Ephemeral });
    await saveGuildData(guildId, gd);
    return interaction.reply({ content: `> Removed highlight for \`${kw}\`.`, flags: MessageFlags.Ephemeral });
  }

  if (sub === "list") {
    const kws = hl[userId];
    if (!kws?.length) return interaction.reply({ content: "> You have no highlighted keywords in this server.", flags: MessageFlags.Ephemeral });
    return interaction.reply({
      embeds: [new EmbedBuilder().setTitle("Your Highlights").setDescription(kws.map(k => `\`${k}\``).join(", ")).setColor(0x5865F2)],
      flags: MessageFlags.Ephemeral,
    });
  }

  if (sub === "clear") {
    hl[userId] = [];
    await saveGuildData(guildId, gd);
    return interaction.reply({ content: "> All your highlights cleared.", flags: MessageFlags.Ephemeral });
  }
}

// In-memory cooldown to prevent DM spam: Map<"userId:guildId:keyword", lastNotifiedAt>
const hlCooldowns = new Map();

/**
 * Check a message against all highlights in the guild.
 * Called from messageCreate. Fire-and-forget.
 */
export async function processHighlights(message) {
  if (!message.guildId || message.author?.bot || !message.content) return;
  try {
    const gd = await loadGuildData(message.guildId);
    const hl = gd.highlights ?? {};
    const content = message.content.toLowerCase();

    for (const [userId, keywords] of Object.entries(hl)) {
      if (!keywords?.length) continue;
      if (userId === message.author.id) continue; // don't notify on own messages

      // Check if user is in the guild and not in the channel (to avoid pinging active users)
      const member = message.guild.members.cache.get(userId);
      if (!member) continue;

      for (const kw of keywords) {
        if (!content.includes(kw)) continue;

        // 30-second cooldown per user+keyword combo
        const cdKey = `${userId}:${message.guildId}:${kw}`;
        const lastNotified = hlCooldowns.get(cdKey) ?? 0;
        if (Date.now() - lastNotified < 30_000) break;
        hlCooldowns.set(cdKey, Date.now());
        setTimeout(() => hlCooldowns.delete(cdKey), 60_000);

        const embed = new EmbedBuilder()
          .setTitle("💬 Keyword Mentioned")
          .setDescription(`Your keyword **${kw}** was mentioned in **${message.guild.name}**`)
          .addFields(
            { name: "Channel", value: `<#${message.channelId}>`, inline: true },
            { name: "Author", value: `<@${message.author.id}>`, inline: true },
            { name: "Message", value: message.content.slice(0, 300) },
          )
          .setColor(0x5865F2)
          .setTimestamp();

        const user = message.client.users.cache.get(userId) ?? await message.client.users.fetch(userId).catch(() => null);
        if (user) await user.send({ embeds: [embed] }).catch(() => null);
        break; // one keyword match per user per message
      }
    }
  } catch { /* highlights must not crash the bot */ }
}
