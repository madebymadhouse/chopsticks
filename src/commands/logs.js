import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { buildEmbed } from "../utils/discordOutput.js";
import { listCommandLogs } from "../utils/commandlog.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { AUDIT_EVENT_TYPES } from "../tools/auditLog/dispatcher.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "admin",
  deployGlobal: true,
};

export const data = new SlashCommandBuilder()
  .setName("logs")
  .setDescription("Command logs and audit log channel configuration")
  .addSubcommand(s =>
    s
      .setName("show")
      .setDescription("Show recent command logs")
      .addIntegerOption(o =>
        o.setName("limit").setDescription("Number of entries").setMinValue(1).setMaxValue(50)
      )
  )
  .addSubcommand(s =>
    s
      .setName("export")
      .setDescription("Export command logs")
      .addStringOption(o =>
        o
          .setName("format")
          .setDescription("json or csv")
          .setRequired(true)
          .addChoices(
            { name: "json", value: "json" },
            { name: "csv", value: "csv" }
          )
      )
      .addIntegerOption(o =>
        o.setName("limit").setDescription("Number of entries").setMinValue(1).setMaxValue(200)
      )
  )
  // Audit log channel configuration
  .addSubcommand(s =>
    s
      .setName("channel-set")
      .setDescription("Set the audit log channel for an event type (or * for all events)")
      .addStringOption(o =>
        o
          .setName("event")
          .setDescription("Event type to configure")
          .setRequired(true)
          .addChoices(
            { name: "All events (*)", value: "*" },
            ...AUDIT_EVENT_TYPES.map(e => ({ name: e, value: e }))
          )
      )
      .addChannelOption(o => o.setName("channel").setDescription("Channel to send audit logs to").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("channel-clear")
      .setDescription("Remove the audit log channel for an event type")
      .addStringOption(o =>
        o
          .setName("event")
          .setDescription("Event type to clear")
          .setRequired(true)
          .addChoices(
            { name: "All events (*)", value: "*" },
            ...AUDIT_EVENT_TYPES.map(e => ({ name: e, value: e }))
          )
      )
  )
  .addSubcommand(s =>
    s.setName("channels-list").setDescription("List all configured audit log channels")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  // ── Channel configuration subcommands ─────────────────────────────────────
  if (sub === "channel-set") {
    const event = interaction.options.getString("event", true);
    const channel = interaction.options.getChannel("channel", true);
    const gd = await loadGuildData(guildId);
    gd.auditLog ??= { channels: {} };
    gd.auditLog.channels ??= {};
    gd.auditLog.channels[event] = channel.id;
    await saveGuildData(guildId, gd);
    return interaction.reply({
      content: `> Audit log channel for **${event}** set to <#${channel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (sub === "channel-clear") {
    const event = interaction.options.getString("event", true);
    const gd = await loadGuildData(guildId);
    if (gd.auditLog?.channels) delete gd.auditLog.channels[event];
    await saveGuildData(guildId, gd);
    return interaction.reply({
      content: `> Audit log channel for **${event}** cleared.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (sub === "channels-list") {
    const gd = await loadGuildData(guildId);
    const channels = gd.auditLog?.channels ?? {};
    const entries = Object.entries(channels);
    if (!entries.length) {
      return interaction.reply({ content: "> No audit log channels configured. Use `/logs channel-set`.", flags: MessageFlags.Ephemeral });
    }
    const lines = entries.map(([e, id]) => `**${e}** → <#${id}>`);
    const embed = new EmbedBuilder()
      .setTitle("Audit Log Channels")
      .setDescription(lines.join("\n"))
      .setColor(0x5865F2);
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }

  // ── Command log subcommands ────────────────────────────────────────────────
  const limit = interaction.options.getInteger("limit") || (sub === "export" ? 100 : 20);
  const list = await listCommandLogs(guildId, limit);

  if (sub === "export") {
    const format = interaction.options.getString("format", true);
    let payload = "";
    if (format === "csv") {
      payload = "at,source,name,userId,ok\n" + list.map(l =>
        `${l.at},${l.source},${l.name},${l.userId},${l.ok}`
      ).join("\n");
    } else {
      payload = JSON.stringify(list, null, 2);
    }
    const buf = Buffer.from(payload, "utf8");
    const file = new AttachmentBuilder(buf, { name: `logs.${format}` });
    await interaction.reply({ flags: MessageFlags.Ephemeral, files: [file] });
    return;
  }

  const lines = list.map(l => {
    const when = l.at ? `<t:${Math.floor(l.at / 1000)}:R>` : "";
    const ok = l.ok ? "ok" : "fail";
    return `${when} ${l.source} ${l.name} by <@${l.userId}> ${ok}`;
  });
  const embed = buildEmbed(
    "Command logs",
    lines.length ? lines.join("\n").slice(0, 1900) : "No logs."
  );
  await interaction.reply({ flags: MessageFlags.Ephemeral, embeds: [embed] });
}


