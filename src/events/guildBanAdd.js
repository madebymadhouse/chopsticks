// src/events/guildBanAdd.js
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";
import { getAntinukeConfig, recordAction, punishExecutor } from "../tools/antinuke/engine.js";

export default {
  name: "guildBanAdd",
  async execute(ban) {
    // Anti-nuke: detect who issued the ban
    try {
      const config = await getAntinukeConfig(ban.guild.id);
      if (config.enabled) {
        await new Promise(r => setTimeout(r, 500));
        const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
        const entry = audit?.entries.first();
        if (entry && entry.executor && Date.now() - entry.createdTimestamp < 5000) {
          const exceeded = recordAction(ban.guild.id, entry.executor.id, "ban", config);
          if (exceeded) await punishExecutor(ban.guild, entry.executor.id, "ban", config);
        }
      }
    } catch { /* anti-nuke must not crash the event */ }

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

