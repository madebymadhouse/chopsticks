// src/events/roleDelete.js
import { EmbedBuilder } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";

export default {
  name: "roleDelete",
  async execute(role) {
    const embed = new EmbedBuilder()
      .setTitle("Role Deleted")
      .setColor(0xED4245)
      .addFields(
        { name: "Name", value: role.name ?? "?", inline: true },
        { name: "ID", value: role.id, inline: true },
      )
      .setTimestamp();
    await dispatchAuditLog(role.guild, "roleDelete", embed);
  },
};
