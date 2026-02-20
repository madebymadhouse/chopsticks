import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { loadGuildData } from "../utils/storage.js";
import { Colors } from "../utils/discordOutput.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

const TYPE_ICONS = {
  ban: "⛔",
  kick: "👢",
  warn: "⚠️",
  timeout: "⏱️",
  note: "📝"
};

const VALID_TYPES = ["all", "bans", "kicks", "warns", "timeouts", "notes"];

export const data = new SlashCommandBuilder()
  .setName("history")
  .setDescription("View moderation history for a user")
  .addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true))
  .addStringOption(o =>
    o.setName("type")
      .setDescription("Filter by action type")
      .addChoices(
        { name: "All", value: "all" },
        { name: "Bans", value: "bans" },
        { name: "Kicks", value: "kicks" },
        { name: "Warns", value: "warns" },
        { name: "Timeouts", value: "timeouts" },
        { name: "Notes", value: "notes" }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

function typeFilter(filterArg) {
  if (!filterArg || filterArg === "all") return null;
  // Map plural to singular action name
  const map = { bans: "ban", kicks: "kick", warns: "warn", timeouts: "timeout", notes: "note" };
  return map[filterArg] ?? null;
}

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const typeArg = interaction.options.getString("type") ?? "all";
  const filterAction = typeFilter(typeArg);

  const guildData = await loadGuildData(interaction.guildId);

  // Gather mod log entries
  const modLogEntries = (guildData.moderationLog?.[user.id] ?? []).map(entry => ({
    type: entry.action ?? "unknown",
    moderator: entry.actorId ?? "unknown",
    text: entry.reason ?? "No reason provided.",
    timestamp: entry.timestamp ?? entry.at ?? null
  }));

  // Gather notes
  const noteEntries = (guildData.notes?.[user.id] ?? []).map(note => ({
    type: "note",
    moderator: note.addedBy ?? "unknown",
    text: note.text ?? "",
    timestamp: note.addedAt ?? null
  }));

  let entries = [...modLogEntries, ...noteEntries];

  if (filterAction) {
    entries = entries.filter(e => e.type === filterAction);
  }

  if (entries.length === 0) {
    await interaction.reply({
      content: `No moderation history found for **${user.tag}**.`,
      flags: 64
    });
    return;
  }

  const PAGE_SIZE = 5;
  const page = entries.slice(0, PAGE_SIZE);

  const embed = new EmbedBuilder()
    .setTitle(`Moderation History — ${user.tag}`)
    .setColor(Colors.Info)
    .setDescription(
      page.map(e => {
        const icon = TYPE_ICONS[e.type] ?? "📋";
        const ts = e.timestamp
          ? `<t:${Math.floor(new Date(e.timestamp).getTime() / 1000)}:R>`
          : "unknown time";
        return `${icon} **${e.type}** • <@${e.moderator}> • ${ts}\n${String(e.text).slice(0, 200)}`;
      }).join("\n\n").slice(0, 4000)
    )
    .setFooter({
      text: `${entries.length} entry(s) total${entries.length > PAGE_SIZE ? ` (showing first ${PAGE_SIZE})` : ""}`
    });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
