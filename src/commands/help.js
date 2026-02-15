import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { loadGuildData } from "../utils/storage.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show the Chopsticks help guide");

function categoryMap() {
  return {
    mod: new Set(["ban","unban","kick","timeout","purge","slowmode","warn","warnings","clearwarns","lock","unlock","nick","softban","role"]),
    util: new Set(["ping","uptime","help","serverinfo","userinfo","avatar","roleinfo","botinfo","invite","echo"]),
    fun: new Set(["8ball","coinflip","roll","choose"]),
    admin: new Set(["config","prefix","alias","agents","logs","macro","custom"]),
    music: new Set(["music"]),
    voice: new Set(["voice","welcome","autorole"]),
    tools: new Set(["poll","giveaway","remind","commands"]),
    assistant: new Set(["assistant"]),
    economy: new Set(["balance","bank","daily","work","pay","inventory","vault","collection","gather","use"]),
    pools: new Set(["pools"])
  };
}

function inferCategory(command) {
  const explicit = command?.meta?.category;
  if (explicit) return String(explicit);

  const name = String(command?.data?.name || "");
  const map = categoryMap();
  for (const [category, names] of Object.entries(map)) {
    if (names.has(name)) return category;
  }
  return "general";
}

function commandRecord(command) {
  const json = command?.data?.toJSON?.() ?? command?.data ?? {};
  return {
    name: String(json.name || command?.data?.name || ""),
    description: String(json.description || command?.data?.description || "No description."),
    category: inferCategory(command)
  };
}

function chunkLines(lines, maxLen = 980) {
  const out = [];
  let cur = "";
  for (const line of lines) {
    const next = cur ? `${cur}\n${line}` : line;
    if (next.length > maxLen && cur) {
      out.push(cur);
      cur = line;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function buildSummaryEmbed({ prefix, commandCount, categoryCount }) {
  return new EmbedBuilder()
    .setTitle("Chopsticks Help Center")
    .setColor(0x00a86b)
    .setDescription(
      "Production-ready multi-system Discord bot for music, VoiceMaster rooms, assistants, pools, and moderation."
    )
    .addFields(
      {
        name: "Quick Start",
        value:
          "1. Deploy agents: `/agents deploy desired_total:10`\n" +
          "2. Start music: `/music play query:<song>`\n" +
          "3. Configure VoiceMaster: `/voice setup` and `/voice console`\n" +
          "4. Open command center: `/commands ui`"
      },
      {
        name: "Core Systems",
        value:
          "• Music + Lavalink + pooled agents\n" +
          "• VoiceMaster temp VCs with owner controls\n" +
          "• Assistant voice workflows\n" +
          "• Pools, deployment, and dashboard tooling"
      },
      {
        name: "Usage Tips",
        value:
          `• Slash commands: \`/command\`\n` +
          `• Prefix commands: \`${prefix}command\`\n` +
          "• Use `/commands ui` for guided browsing\n" +
          "• Use `/help` anytime for full reference"
      },
      {
        name: "Coverage",
        value: `Commands: **${commandCount}**\nCategories: **${categoryCount}**`
      }
    )
    .setFooter({ text: "Chopsticks • Help Guide" })
    .setTimestamp();
}

function buildIndexEmbeds(records) {
  const byCategory = new Map();
  for (const rec of records) {
    const key = rec.category || "general";
    const list = byCategory.get(key) || [];
    list.push(rec);
    byCategory.set(key, list);
  }

  for (const list of byCategory.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const categories = Array.from(byCategory.keys()).sort();
  const embeds = [];
  let current = new EmbedBuilder()
    .setTitle("Command Index")
    .setColor(0x2b2d31)
    .setDescription("Grouped by category with descriptions.");
  let fieldsInCurrent = 0;

  for (const category of categories) {
    const list = byCategory.get(category) || [];
    const lines = list.map(rec => `• \`/${rec.name}\` - ${rec.description}`);
    const chunks = chunkLines(lines, 950);

    for (let i = 0; i < chunks.length; i += 1) {
      if (fieldsInCurrent >= 6) {
        embeds.push(current);
        current = new EmbedBuilder().setTitle("Command Index (cont.)").setColor(0x2b2d31);
        fieldsInCurrent = 0;
      }
      const suffix = i === 0 ? "" : ` (cont. ${i + 1})`;
      current.addFields({
        name: `${category}${suffix}`,
        value: chunks[i]
      });
      fieldsInCurrent += 1;
    }
  }

  if (fieldsInCurrent > 0) embeds.push(current);
  return embeds;
}

export async function execute(interaction) {
  const records = Array.from(interaction.client.commands.values())
    .map(commandRecord)
    .filter(r => r.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  let prefix = "!";
  if (interaction.inGuild()) {
    try {
      const guildData = await loadGuildData(interaction.guildId);
      prefix = guildData?.prefix?.value || "!";
    } catch {}
  }

  const categories = new Set(records.map(r => r.category || "general"));
  const summary = buildSummaryEmbed({
    prefix,
    commandCount: records.length,
    categoryCount: categories.size
  });
  const indexEmbeds = buildIndexEmbeds(records);
  const allEmbeds = [summary, ...indexEmbeds];

  if (!allEmbeds.length) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "No help content is available right now."
    });
    return;
  }

  await interaction.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [allEmbeds[0]]
  });

  for (let i = 1; i < allEmbeds.length; i += 1) {
    await interaction.followUp({
      flags: MessageFlags.Ephemeral,
      embeds: [allEmbeds[i]]
    });
  }
}
