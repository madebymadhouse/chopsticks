import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { setAlias, clearAlias, getAliases } from "../utils/aliases.js";
import { replyEmbed, replyEmbedWithJson } from "../utils/discordOutput.js";
import { normalizeAliasName } from "../prefix/hardening.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "admin"
};

export const data = new SlashCommandBuilder()
  .setName("alias")
  .setDescription("Prefix alias management")
  .addSubcommand(s =>
    s
      .setName("set")
      .setDescription("Set an alias")
      .addStringOption(o => o.setName("alias").setDescription("Alias").setRequired(true))
      .addStringOption(o => o.setName("command").setDescription("Command").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("clear")
      .setDescription("Clear an alias")
      .addStringOption(o => o.setName("alias").setDescription("Alias").setRequired(true))
  )
  .addSubcommand(s =>
    s.setName("list").setDescription("List aliases")
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  if (sub === "list") {
    const aliases = await getAliases(guildId);
    await replyEmbedWithJson(
      interaction,
      "Aliases",
      `Total aliases: ${Object.keys(aliases || {}).length}`,
      aliases,
      "aliases.json"
    );
    return;
  }
  if (sub === "set") {
    const alias = interaction.options.getString("alias", true);
    const commandName = interaction.options.getString("command", true);
    try {
      const result = await setAlias(guildId, alias, commandName);
      await replyEmbed(interaction, "Alias updated", `${result.alias} -> ${result.commandName}`);
    } catch (err) {
      await replyEmbed(interaction, "Alias rejected", err?.message || "Invalid alias.");
    }
    return;
  }
  if (sub === "clear") {
    const alias = interaction.options.getString("alias", true);
    const result = await clearAlias(guildId, alias);
    await replyEmbed(interaction, "Alias removed", `${normalizeAliasName(result.alias)}`);
  }
}
