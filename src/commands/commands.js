import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import { replyInteraction } from "../utils/interactionReply.js";
import { Colors } from "../utils/discordOutput.js";

const UI_PREFIX = "cmdui";

export const meta = {
  deployGlobal: false,
  category: "info",
  guildOnly: true,
};

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
    admin: new Set(["config","prefix","alias","agents","reactionroles","levels","automations","setup","modlogs"]),
    music: new Set(["music"]),
    voice: new Set(["voice","welcome","autorole"]),
    tools: new Set(["poll","giveaway","remind","starboard","tickets"]),
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

function categoryListEmbed(cats) {
  const names = Array.from(cats.keys()).sort();
  const lines = names.map(name => {
    const count = cats.get(name)?.length ?? 0;
    return `• \`${name}\` - ${count} command${count === 1 ? "" : "s"}`;
  });
  return new EmbedBuilder()
    .setTitle("Command Categories")
    .setColor(Colors.INFO)
    .setDescription(lines.length ? lines.join("\n") : "No categories available.")
    .setTimestamp();
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
    .setColor(Colors.INFO)
    .setDescription(
      (categoryLine || "No command categories available.") +
      "\n\nUse the dropdowns to filter by category and inspect command variants."
    );

  if (selectedCategory && categories.has(selectedCategory)) {
    const commands = categories.get(selectedCategory) || [];
    embed.addFields({
      name: `Category: ${selectedCategory}`,
      value: commands.length ? commands.map(name => `• /${name}`).join("\n").slice(0, 1024) : "No commands in this category."
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
    await replyInteraction(interaction, { embeds: [categoryListEmbed(cats)] });
    return;
  }

  if (sub === "category") {
    const name = interaction.options.getString("name", true);
    const list = cats.get(name);
    if (!list) {
      await replyInteraction(interaction, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Category Not Found")
            .setColor(Colors.ERROR)
            .setDescription(`No category named \`${name}\` was found.\nUse \`/commands list\` to browse available categories.`)
        ]
      });
      return;
    }
    const lines = list.map(cmdName => {
      const summary = commandSummary(cmds.get(cmdName));
      return `• **/${cmdName}** - ${summary.description}`;
    });
    await replyInteraction(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle(`Category: ${name}`)
          .setColor(Colors.INFO)
          .setDescription(lines.join("\n").slice(0, 4096))
          .setFooter({ text: `${list.length} command${list.length === 1 ? "" : "s"}` })
      ]
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
    await replyInteraction(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle("Command Search")
          .setColor(hits.length ? Colors.SUCCESS : Colors.WARNING)
          .setDescription(
            hits.length
              ? hits.slice(0, 40).map(n => `• /${n}`).join("\n")
              : `No command names matched \`${term}\`.`
          )
          .setFooter({ text: hits.length ? `${hits.length} match${hits.length === 1 ? "" : "es"}` : "Try a shorter keyword." })
      ]
    });
    return;
  }

  if (sub === "ui") {
    const embed = buildCommandCenterEmbed(interaction.client);
    const components = buildCommandCenterComponents(interaction.client, interaction.user.id);
    await replyInteraction(interaction, { embeds: [embed], components });
  }
}

export async function handleSelect(interaction) {
  if (!interaction.isStringSelectMenu?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await replyInteraction(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle("Panel Locked")
          .setColor(Colors.ERROR)
          .setDescription("This command panel belongs to another user.")
      ]
    });
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

  await replyInteraction(interaction, {
    embeds: [
      new EmbedBuilder()
        .setTitle("Unsupported Action")
        .setColor(Colors.WARNING)
        .setDescription("This command center action is not supported.")
    ]
  });
  return true;
}

export async function handleButton(interaction) {
  if (!interaction.isButton?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await replyInteraction(interaction, {
      embeds: [
        new EmbedBuilder()
          .setTitle("Panel Locked")
          .setColor(Colors.ERROR)
          .setDescription("This command panel belongs to another user.")
      ]
    });
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

  await replyInteraction(interaction, {
    embeds: [
      new EmbedBuilder()
        .setTitle("Unsupported Button")
        .setColor(Colors.WARNING)
        .setDescription("This command center button is not supported.")
    ]
  });
  return true;
}
