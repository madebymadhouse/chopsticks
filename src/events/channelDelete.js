// src/events/channelDelete.js
import { EmbedBuilder } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";

export default {
  name: "channelDelete",
  async execute(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
      .setTitle("Channel Deleted")
      .setColor(0xED4245)
      .addFields(
        { name: "Name", value: channel.name ?? "?", inline: true },
        { name: "Type", value: channel.type?.toString() ?? "?", inline: true },
        { name: "ID", value: channel.id, inline: true },
      )
      .setTimestamp();
    await dispatchAuditLog(channel.guild, "channelDelete", embed);
  },
};
