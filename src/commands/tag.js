import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { Colors } from "../utils/discordOutput.js";
import { sanitizeString } from "../utils/validation.js";

export const meta = {
  deployGlobal: false,
  guildOnly: true,
  userPerms: [],
  category: "utility"
};

const TAG_NAME_RE = /^[a-z0-9-]{1,32}$/;

export const data = new SlashCommandBuilder()
  .setName("tag")
  .setDescription("Manage and retrieve server tags")
  .addSubcommand(sub =>
    sub.setName("get")
      .setDescription("Get a tag by name")
      .addStringOption(o => o.setName("name").setDescription("Tag name").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("set")
      .setDescription("Create or update a tag [requires Manage Server]")
      .addStringOption(o => o.setName("name").setDescription("Tag name (alphanumeric + hyphens, 1-32 chars)").setRequired(true))
      .addStringOption(o =>
        o.setName("content").setDescription("Tag content (up to 2000 chars)").setRequired(true).setMaxLength(2000)
      )
  )
  .addSubcommand(sub =>
    sub.setName("delete")
      .setDescription("Delete a tag [requires Manage Server]")
      .addStringOption(o => o.setName("name").setDescription("Tag name").setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName("list").setDescription("List all tags in this server")
  );

function validateTagName(name) {
  const normalized = String(name || "").toLowerCase().trim();
  return TAG_NAME_RE.test(normalized) ? normalized : null;
}

function hasManageGuild(interaction) {
  return interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
    interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator);
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "set" || sub === "delete") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({ content: "❌ You need the **Manage Server** permission to use this subcommand.", flags: 64 });
      return;
    }
  }

  const guildData = await loadGuildData(interaction.guildId);
  if (!guildData.tags) guildData.tags = {};

  if (sub === "get") {
    const rawName = sanitizeString(interaction.options.getString("name", true));
    const name = validateTagName(rawName);
    if (!name) {
      await interaction.reply({ content: "❌ Invalid tag name. Tag names must be 1-32 characters, lowercase alphanumeric and hyphens only.", flags: 64 });
      return;
    }
    const tag = guildData.tags[name];
    if (!tag) {
      await interaction.reply({ content: `Tag not found. Use \`/tag list\` to see available tags.`, flags: 64 });
      return;
    }
    await interaction.reply({ content: tag.content });
    return;
  }

  if (sub === "set") {
    const rawName = sanitizeString(interaction.options.getString("name", true));
    const content = sanitizeString(interaction.options.getString("content", true));
    const name = validateTagName(rawName);
    if (!name) {
      await interaction.reply({ content: "❌ Invalid tag name. Tag names must be 1-32 characters, lowercase alphanumeric and hyphens only.", flags: 64 });
      return;
    }
    guildData.tags[name] = {
      content,
      createdBy: interaction.user.id,
      createdAt: new Date().toISOString()
    };
    await saveGuildData(interaction.guildId, guildData);
    await interaction.reply({ content: `✅ Tag \`${name}\` saved.`, flags: 64 });
    return;
  }

  if (sub === "delete") {
    const rawName = sanitizeString(interaction.options.getString("name", true));
    const name = validateTagName(rawName);
    if (!name) {
      await interaction.reply({ content: "❌ Invalid tag name. Tag names must be 1-32 characters, lowercase alphanumeric and hyphens only.", flags: 64 });
      return;
    }
    if (!guildData.tags[name]) {
      await interaction.reply({ content: `❌ Tag \`${name}\` does not exist.`, flags: 64 });
      return;
    }
    delete guildData.tags[name];
    await saveGuildData(interaction.guildId, guildData);
    await interaction.reply({ content: `✅ Tag \`${name}\` deleted.`, flags: 64 });
    return;
  }

  if (sub === "list") {
    const names = Object.keys(guildData.tags ?? {});
    if (names.length === 0) {
      await interaction.reply({ content: "No tags found in this server.", flags: 64 });
      return;
    }
    const embed = new EmbedBuilder()
      .setTitle("🏷️ Server Tags")
      .setColor(Colors.Info)
      .setDescription(names.sort().map(n => `\`${n}\``).join(", ").slice(0, 4000))
      .setFooter({ text: `${names.length} tag(s) total` });
    await interaction.reply({ embeds: [embed], flags: 64 });
  }
}
