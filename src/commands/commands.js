import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";

const UI_PREFIX = "cmdui";

export const data = new SlashCommandBuilder()
  .setName("commands")
  .setDescription("Browse commands")
  .addSubcommand(s =>
    s.setName("list").setDescription("List categories")
  )
  .addSubcommand(s =>
    s
      .setName("category")
      .setDescription("List commands in a category")
      .addStringOption(o => o.setName("name").setDescription("Category").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("search")
      .setDescription("Search commands")
      .addStringOption(o => o.setName("term").setDescription("Search term").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("ui")
      .setDescription("Interactive command center (buttons + dropdowns)")
  );

function categorize(commands) {
  const map = {
    mod: new Set(["ban","unban","kick","timeout","purge","slowmode","warn","warnings","clearwarns","lock","unlock","nick","softban","role"]),
    util: new Set(["ping","uptime","help","serverinfo","userinfo","avatar","roleinfo","botinfo","invite","echo"]),
    fun: new Set(["8ball","coinflip","roll","choose","fun"]),
    admin: new Set(["config","prefix","alias","agents"]),
    music: new Set(["music"]),
    voice: new Set(["voice","welcome","autorole"]),
    tools: new Set(["poll","giveaway","remind"]),
    assistant: new Set(["assistant"])
  };
  const out = new Map();
  for (const c of commands.values()) {
    let cat = c.meta?.category;
    if (!cat) {
      const name = c.data?.name || "";
      for (const [k, set] of Object.entries(map)) {
        if (set.has(name)) { cat = k; break; }
      }
    }
    if (!cat) cat = "general";
    const list = out.get(cat) || [];
    list.push(c.data?.name || "unknown");
    out.set(cat, list);
  }
  for (const [k, v] of out.entries()) {
    v.sort();
    out.set(k, v);
  }
  return out;
}

function uiCustomId(...parts) {
  return `${UI_PREFIX}:${parts.join(":")}`;
}

function encodeState(value) {
  if (!value) return "_";
  return encodeURIComponent(String(value));
}

function decodeState(value) {
  if (!value || value === "_") return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function parseUiId(customId) {
  const parts = String(customId || "").split(":");
  if (parts[0] !== UI_PREFIX || parts.length < 3) return null;
  return {
    kind: parts[1],
    userId: parts[2],
    stateA: parts[3] ?? null,
    stateB: parts[4] ?? null
  };
}

function commandSummary(command) {
  const json = command?.data?.toJSON?.() ?? command?.data ?? {};
  const description = json.description || "No description.";
  const options = Array.isArray(json.options) ? json.options : [];
  const subs = options.filter(opt => opt.type === 1).map(opt => opt.name);
  const subText = subs.length ? subs.join(", ") : "none";
  return {
    description,
    subcommands: subText,
    subcommandCount: subs.length
  };
}

function buildCommandCenterEmbed(client, selectedCategory = null, selectedCommand = null) {
  const categories = categorize(client.commands);
  const categoryNames = Array.from(categories.keys()).sort();
  const categoryLine = categoryNames.map(name => {
    const count = categories.get(name)?.length ?? 0;
    return `\`${name}\` (${count})`;
  }).join("  ");

  const embed = new EmbedBuilder()
    .setTitle("Chopsticks Command Center")
    .setDescription(categoryLine || "No command categories available.");

  if (selectedCategory && categories.has(selectedCategory)) {
    const commands = categories.get(selectedCategory) || [];
    embed.addFields({
      name: `Category: ${selectedCategory}`,
      value: commands.length ? commands.map(name => `/${name}`).join(" ") : "No commands in this category."
    });

    if (selectedCommand && commands.includes(selectedCommand)) {
      const command = client.commands.get(selectedCommand);
      const summary = commandSummary(command);
      embed.addFields({
        name: `Command: /${selectedCommand}`,
        value: `Description: ${summary.description}\nSubcommands: ${summary.subcommands}`
      });
    }
  }

  return embed;
}

function buildCommandCenterComponents(client, userId, selectedCategory = null, selectedCommand = null) {
  const categories = categorize(client.commands);
  const categoryNames = Array.from(categories.keys()).sort();

  const categoryOptions = categoryNames.slice(0, 25).map(name => ({
    label: name,
    value: name,
    description: `${categories.get(name)?.length ?? 0} command(s)`,
    default: selectedCategory === name
  }));

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(uiCustomId("cat", userId))
    .setPlaceholder("Choose a category")
    .addOptions(categoryOptions.length ? categoryOptions : [{ label: "No categories", value: "none", default: true }])
    .setDisabled(categoryOptions.length === 0);

  const commands = selectedCategory ? (categories.get(selectedCategory) || []) : [];
  const commandOptions = commands.slice(0, 25).map(name => ({
    label: `/${name}`,
    value: name,
    description: client.commands.get(name)?.data?.description || "Command",
    default: selectedCommand === name
  }));

  const commandSelect = new StringSelectMenuBuilder()
    .setCustomId(uiCustomId("cmd", userId, encodeState(selectedCategory)))
    .setPlaceholder(selectedCategory ? "Choose a command" : "Choose a category first")
    .addOptions(commandOptions.length ? commandOptions : [{ label: "No commands", value: "none", default: true }])
    .setDisabled(commandOptions.length === 0);

  const refreshButton = new ButtonBuilder()
    .setCustomId(uiCustomId("refresh", userId, encodeState(selectedCategory), encodeState(selectedCommand)))
    .setLabel("Refresh")
    .setStyle(ButtonStyle.Secondary);

  const clearButton = new ButtonBuilder()
    .setCustomId(uiCustomId("clear", userId))
    .setLabel("Clear")
    .setStyle(ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(categorySelect),
    new ActionRowBuilder().addComponents(commandSelect),
    new ActionRowBuilder().addComponents(refreshButton, clearButton)
  ];
}

async function updateCommandCenter(interaction, userId, category = null, command = null) {
  const embed = buildCommandCenterEmbed(interaction.client, category, command);
  const components = buildCommandCenterComponents(interaction.client, userId, category, command);
  await interaction.update({ embeds: [embed], components });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const cmds = interaction.client.commands;
  const cats = categorize(cmds);

  if (sub === "list") {
    const list = Array.from(cats.keys()).sort();
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Categories:\n" + list.join(", ")
    });
    return;
  }

  if (sub === "category") {
    const name = interaction.options.getString("name", true);
    const list = cats.get(name);
    if (!list) {
      await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Category not found." });
      return;
    }
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: `/${name}: ` + list.map(c => `/${c}`).join(", ")
    });
    return;
  }

  if (sub === "search") {
    const term = interaction.options.getString("term", true).toLowerCase();
    const hits = [];
    for (const c of cmds.values()) {
      const name = c.data?.name || "";
      if (name.includes(term)) hits.push(name);
    }
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: hits.length ? hits.map(n => `/${n}`).join(", ") : "No matches."
    });
    return;
  }

  if (sub === "ui") {
    const embed = buildCommandCenterEmbed(interaction.client);
    const components = buildCommandCenterComponents(interaction.client, interaction.user.id);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [embed],
      components
    });
  }
}

export async function handleSelect(interaction) {
  if (!interaction.isStringSelectMenu?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({ content: "This panel belongs to another user.", ephemeral: true });
    return true;
  }

  if (parsed.kind === "cat") {
    const category = interaction.values?.[0] || null;
    await updateCommandCenter(interaction, parsed.userId, category, null);
    return true;
  }

  if (parsed.kind === "cmd") {
    const category = decodeState(parsed.stateA);
    const command = interaction.values?.[0] || null;
    await updateCommandCenter(interaction, parsed.userId, category, command);
    return true;
  }

  await interaction.reply({ content: "Unsupported command center action.", ephemeral: true });
  return true;
}

export async function handleButton(interaction) {
  if (!interaction.isButton?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({ content: "This panel belongs to another user.", ephemeral: true });
    return true;
  }

  if (parsed.kind === "clear") {
    await updateCommandCenter(interaction, parsed.userId, null, null);
    return true;
  }

  if (parsed.kind === "refresh") {
    const category = decodeState(parsed.stateA);
    const command = decodeState(parsed.stateB);
    await updateCommandCenter(interaction, parsed.userId, category, command);
    return true;
  }

  await interaction.reply({ content: "Unsupported command center button.", ephemeral: true });
  return true;
}
