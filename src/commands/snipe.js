// src/commands/snipe.js
// /snipe — show last deleted message in the channel
// /editsnipe — show last edited message in the channel
// /snipeclear — clear snipe cache for the channel (mod only)
//
// Messages are cached in memory (Map) for up to 5 minutes.

import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";

export const meta = {
  name: "snipe",
  category: "utility",
  deployGlobal: true,
};

// In-memory caches: Map<channelId, { content, author, createdAt, attachmentUrl? }>
export const snipeCache = new Map();   // deleted messages
export const editSnipeCache = new Map(); // edited messages: { before, after, author, editedAt }

const SNIPE_TTL = 5 * 60 * 1000; // 5 minutes

export function cacheDelete(message) {
  if (!message.content && !message.attachments.size) return;
  snipeCache.set(message.channelId, {
    content: message.content ?? "",
    authorId: message.author?.id ?? "0",
    authorTag: message.author?.tag ?? "Unknown",
    authorAvatar: message.author?.displayAvatarURL() ?? null,
    attachmentUrl: message.attachments.first()?.url ?? null,
    deletedAt: Date.now(),
  });
  setTimeout(() => snipeCache.delete(message.channelId), SNIPE_TTL);
}

export function cacheEdit(oldMessage, newMessage) {
  if (!oldMessage.content) return;
  editSnipeCache.set(oldMessage.channelId, {
    before: oldMessage.content,
    after: newMessage.content ?? "",
    authorId: oldMessage.author?.id ?? "0",
    authorTag: oldMessage.author?.tag ?? "Unknown",
    authorAvatar: oldMessage.author?.displayAvatarURL() ?? null,
    editedAt: Date.now(),
    url: newMessage.url,
  });
  setTimeout(() => editSnipeCache.delete(oldMessage.channelId), SNIPE_TTL);
}

export const data = new SlashCommandBuilder()
  .setName("snipe")
  .setDescription("Show the last deleted or edited message in this channel")
  .addSubcommand(s => s
    .setName("deleted")
    .setDescription("Show the last deleted message"))
  .addSubcommand(s => s
    .setName("edited")
    .setDescription("Show the last edited message"))
  .addSubcommand(s => s
    .setName("clear")
    .setDescription("Clear the snipe cache for this channel (moderators only)"));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const channelId = interaction.channelId;

  if (sub === "deleted") {
    const entry = snipeCache.get(channelId);
    if (!entry) return interaction.reply({ content: "> Nothing to snipe in this channel.", flags: MessageFlags.Ephemeral });
    const embed = new EmbedBuilder()
      .setAuthor({ name: entry.authorTag, iconURL: entry.authorAvatar ?? undefined })
      .setDescription(entry.content || "*[no text content]*")
      .setColor(0xED4245)
      .setFooter({ text: "Message deleted" })
      .setTimestamp(entry.deletedAt);
    if (entry.attachmentUrl) embed.setImage(entry.attachmentUrl);
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "edited") {
    const entry = editSnipeCache.get(channelId);
    if (!entry) return interaction.reply({ content: "> Nothing to editsnipe in this channel.", flags: MessageFlags.Ephemeral });
    const embed = new EmbedBuilder()
      .setAuthor({ name: entry.authorTag, iconURL: entry.authorAvatar ?? undefined })
      .addFields(
        { name: "Before", value: (entry.before || "*empty*").slice(0, 1024) },
        { name: "After", value: (entry.after || "*empty*").slice(0, 1024) },
      )
      .setColor(0xFEE75C)
      .setFooter({ text: "Message edited" })
      .setTimestamp(entry.editedAt);
    if (entry.url) embed.setURL(entry.url);
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "clear") {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: "> You need **Manage Messages** to clear the snipe cache.", flags: MessageFlags.Ephemeral });
    }
    snipeCache.delete(channelId);
    editSnipeCache.delete(channelId);
    return interaction.reply({ content: "> Snipe cache cleared for this channel.", flags: MessageFlags.Ephemeral });
  }
}
