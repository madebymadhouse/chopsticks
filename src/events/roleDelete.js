// src/events/roleDelete.js
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";
import { getAntinukeConfig, recordAction, punishExecutor } from "../tools/antinuke/engine.js";

export default {
  name: "roleDelete",
  async execute(role) {
    // Anti-nuke
    try {
      const config = await getAntinukeConfig(role.guild.id);
      if (config.enabled) {
        await new Promise(r => setTimeout(r, 500));
        const audit = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
        const entry = audit?.entries.first();
        if (entry && entry.executor && Date.now() - entry.createdTimestamp < 5000) {
          const exceeded = recordAction(role.guild.id, entry.executor.id, "roleDelete", config);
          if (exceeded) await punishExecutor(role.guild, entry.executor.id, "roleDelete", config);
        }
      }
    } catch {}

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

