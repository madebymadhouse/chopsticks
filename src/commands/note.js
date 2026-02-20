import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { replyError } from "../utils/discordOutput.js";
import { Colors } from "../utils/discordOutput.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("note")
  .setDescription("Manage moderator notes for a user")
  .addSubcommand(sub =>
    sub.setName("add")
      .setDescription("Add a note to a user")
      .addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true))
      .addStringOption(o =>
        o.setName("text").setDescription("Note text (up to 1000 chars)").setRequired(true).setMaxLength(1000)
      )
  )
  .addSubcommand(sub =>
    sub.setName("list")
      .setDescription("List notes for a user")
      .addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("delete")
      .setDescription("Delete a note by ID")
      .addUserOption(o => o.setName("user").setDescription("Target user").setRequired(true))
      .addIntegerOption(o => o.setName("id").setDescription("Note ID to delete").setRequired(true).setMinValue(1))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser("user", true);

  const guildData = await loadGuildData(interaction.guildId);
  if (!guildData.notes) guildData.notes = {};

  if (sub === "add") {
    const text = interaction.options.getString("text", true);
    const userNotes = guildData.notes[user.id] ?? [];
    const nextId = userNotes.length > 0 ? Math.max(...userNotes.map(n => n.id)) + 1 : 1;
    userNotes.push({
      id: nextId,
      text,
      addedBy: interaction.user.id,
      addedAt: new Date().toISOString()
    });
    guildData.notes[user.id] = userNotes;
    await saveGuildData(interaction.guildId, guildData);
    await interaction.reply({ content: `✅ Note added (id: ${nextId})`, flags: 64 });
    return;
  }

  if (sub === "list") {
    const userNotes = guildData.notes[user.id] ?? [];
    if (userNotes.length === 0) {
      await interaction.reply({ content: `No notes found for **${user.tag}**.`, flags: 64 });
      return;
    }

    const PAGE_SIZE = 10;
    const page = userNotes.slice(0, PAGE_SIZE);
    const embed = new EmbedBuilder()
      .setTitle(`📝 Notes for ${user.tag}`)
      .setColor(Colors.Info)
      .setDescription(
        page.map(n =>
          `**#${n.id}** — <@${n.addedBy}> • <t:${Math.floor(new Date(n.addedAt).getTime() / 1000)}:R>\n${n.text}`
        ).join("\n\n").slice(0, 4000)
      )
      .setFooter({ text: `${userNotes.length} note(s) total${userNotes.length > PAGE_SIZE ? ` (showing first ${PAGE_SIZE})` : ""}` });

    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (sub === "delete") {
    const noteId = interaction.options.getInteger("id", true);
    const userNotes = guildData.notes[user.id] ?? [];
    const idx = userNotes.findIndex(n => n.id === noteId);
    if (idx === -1) {
      await replyError(interaction, "Note Not Found", `No note with id **${noteId}** found for **${user.tag}**.`);
      return;
    }
    userNotes.splice(idx, 1);
    guildData.notes[user.id] = userNotes;
    await saveGuildData(interaction.guildId, guildData);
    await interaction.reply({ content: `✅ Note deleted`, flags: 64 });
  }
}
