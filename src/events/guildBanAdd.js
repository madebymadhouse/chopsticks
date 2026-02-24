// src/events/guildBanAdd.js
import { EmbedBuilder } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";

export default {
  name: "guildBanAdd",
  async execute(ban) {
    const embed = new EmbedBuilder()
      .setTitle("Member Banned")
      .setColor(0xED4245)
      .addFields(
        { name: "User", value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
        { name: "Reason", value: ban.reason ?? "No reason provided" },
      )
      .setThumbnail(ban.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `User ID: ${ban.user.id}` });
    await dispatchAuditLog(ban.guild, "guildBanAdd", embed);
  },
};
