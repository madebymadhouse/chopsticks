// src/events/messageDelete.js
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";
import { cacheDelete } from "../commands/snipe.js";

export default {
  name: "messageDelete",
  async execute(message) {
    // Snipe cache (before guild check — captures DM deletions too, but we guard inside cacheDelete)
    if (!message.author?.bot) cacheDelete(message);

    if (!message.guild || message.author?.bot) return;
    const content = message.content ?? "(no text content)";

    const embed = new EmbedBuilder()
      .setTitle("Message Deleted")
      .setColor(0xED4245)
      .addFields(
        { name: "Author", value: message.author ? `<@${message.author.id}> (${message.author.tag})` : "Unknown", inline: true },
        { name: "Channel", value: `<#${message.channelId}>`, inline: true },
        { name: "Content", value: content.slice(0, 900) || "(empty)" },
      )
      .setTimestamp()
      .setFooter({ text: `User ID: ${message.author?.id ?? "?"}` });

    try {
      await new Promise(r => setTimeout(r, 800));
      const audit = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 1 });
      const entry = audit.entries.first();
      if (entry && Date.now() - entry.createdTimestamp < 5000) {
        embed.addFields({ name: "Deleted by", value: `<@${entry.executor?.id}>`, inline: true });
      }
    } catch { /* audit log unavailable */ }

    await dispatchAuditLog(message.guild, "messageDelete", embed);
  },
};
