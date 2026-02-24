// src/events/guildBanRemove.js
import { EmbedBuilder } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";

export default {
  name: "guildBanRemove",
  async execute(ban) {
    const embed = new EmbedBuilder()
      .setTitle("Member Unbanned")
      .setColor(0x57F287)
      .addFields({ name: "User", value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true })
      .setThumbnail(ban.user.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: `User ID: ${ban.user.id}` });
    await dispatchAuditLog(ban.guild, "guildBanRemove", embed);
  },
};
