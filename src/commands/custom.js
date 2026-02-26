import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export const meta = {
  deployGlobal: false,
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "tools"
};

export const data = new SlashCommandBuilder()
  .setName("custom")
  .setDescription("Custom commands")
  .addSubcommand(s =>
    s
      .setName("set")
      .setDescription("Create or update a custom command")
      .addStringOption(o => o.setName("name").setDescription("Name").setRequired(true))
      .addStringOption(o => o.setName("response").setDescription("Response").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("delete")
      .setDescription("Delete a custom command")
      .addStringOption(o => o.setName("name").setDescription("Name").setRequired(true))
  )
  .addSubcommand(s =>
    s.setName("list").setDescription("List custom commands")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const data = await loadGuildData(interaction.guildId);
  data.customCommands ??= {};

  if (sub === "list") {
    const names = Object.keys(data.customCommands);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: names.length ? names.join(", ") : "No custom commands."
    });
    return;
  }

  const name = interaction.options.getString("name", true).toLowerCase();

  if (sub === "set") {
    const response = interaction.options.getString("response", true);
    if (!/^[a-z0-9_-]{2,32}$/i.test(name)) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Invalid name (2-32 chars)." });
      return;
    }
    data.customCommands[name] = { response };
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Saved custom command: ${name}` });
    return;
  }

  if (sub === "delete") {
    delete data.customCommands[name];
    await saveGuildData(interaction.guildId, data);
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: `Deleted custom command: ${name}` });
  }
}
