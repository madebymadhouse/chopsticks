// src/events/channelDelete.js
import { EmbedBuilder, AuditLogEvent } from "discord.js";
import { dispatchAuditLog } from "../tools/auditLog/dispatcher.js";
import { getAntinukeConfig, recordAction, punishExecutor } from "../tools/antinuke/engine.js";

export default {
  name: "channelDelete",
  async execute(channel) {
    if (!channel.guild) return;

    // Anti-nuke
    try {
      const config = await getAntinukeConfig(channel.guild.id);
      if (config.enabled) {
        await new Promise(r => setTimeout(r, 500));
        const audit = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
        const entry = audit?.entries.first();
        if (entry && entry.executor && Date.now() - entry.createdTimestamp < 5000) {
          const exceeded = recordAction(channel.guild.id, entry.executor.id, "channelDelete", config);
          if (exceeded) await punishExecutor(channel.guild, entry.executor.id, "channelDelete", config);
        }
      }
    } catch {}

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

