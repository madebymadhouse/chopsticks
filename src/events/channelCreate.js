// src/events/channelCreate.js
import { EmbedBuilder } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";

export default {
  name: "channelCreate",
  async execute(channel) {
    if (!channel.guild) return;
    const embed = new EmbedBuilder()
      .setTitle("Channel Created")
      .setColor(0x57F287)
      .addFields(
        { name: "Name", value: channel.name, inline: true },
        { name: "Type", value: channel.type?.toString() ?? "?", inline: true },
        { name: "ID", value: channel.id, inline: true },
      )
      .setTimestamp();
    await dispatchAuditLog(channel.guild, "channelCreate", embed);
  },
};
