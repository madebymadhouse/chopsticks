import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import {
  FUN_VARIANT_COUNT,
  clampIntensity,
  findVariants,
  getVariantById,
  listVariantStats,
  randomVariantId,
  renderFunVariant,
  sampleVariantIds
} from "../fun/variants.js";

export const meta = {
  guildOnly: false,
  userPerms: [],
  category: "fun"
};

export const data = new SlashCommandBuilder()
  .setName("fun")
  .setDescription("Run one of 200+ fun interaction variants")
  .addSubcommand(s =>
    s
      .setName("play")
      .setDescription("Run a specific fun variant")
      .addStringOption(o =>
        o
          .setName("variant")
          .setDescription("Variant id (autocomplete)")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addStringOption(o =>
        o
          .setName("target")
          .setDescription("Optional target name or mention")
          .setRequired(false)
      )
      .addIntegerOption(o =>
        o
          .setName("intensity")
          .setDescription("1 (calm) to 5 (max)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(5)
      )
  )
  .addSubcommand(s =>
    s
      .setName("random")
      .setDescription("Roll a random fun variant")
      .addStringOption(o =>
        o
          .setName("target")
          .setDescription("Optional target name or mention")
          .setRequired(false)
      )
      .addIntegerOption(o =>
        o
          .setName("intensity")
          .setDescription("1 (calm) to 5 (max)")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(5)
      )
  )
  .addSubcommand(s =>
    s
      .setName("catalog")
      .setDescription("Browse available fun variants")
      .addStringOption(o =>
        o
          .setName("query")
          .setDescription("Search by id, theme, or style")
          .setRequired(false)
          .setAutocomplete(true)
      )
  );

function buildFunEmbed(result) {
  return new EmbedBuilder()
    .setTitle(`Fun Variant: ${result.variant.label}`)
    .setColor(0x3ba55d)
    .setDescription(result.text)
    .addFields(
      { name: "Variant", value: `\`${result.variant.id}\``, inline: true },
      { name: "Intensity", value: String(result.intensity), inline: true }
    )
    .setFooter({ text: result.metaLine });
}

function buildCatalogEmbed(query = "") {
  const stats = listVariantStats();
  const hits = findVariants(query, 20);
  const lines = hits.map(v => `- \`${v.id}\` -> ${v.label}`);
  const sample = sampleVariantIds(8).map(v => `\`${v}\``).join(", ");

  return new EmbedBuilder()
    .setTitle("Fun Catalog")
    .setColor(0x00a8ff)
    .setDescription(
      `Total variants: **${stats.total}** (${stats.themes} themes x ${stats.styles} styles)\n` +
      `Use \`/fun play variant:<id>\` or \`/fun random\`.\n` +
      (query ? `Search query: \`${query}\`\n` : "") +
      `Sample ids: ${sample}`
    )
    .addFields({
      name: "Matching Variants",
      value: lines.length ? lines.join("\n") : "No matches found."
    });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand(true);

  if (sub === "catalog") {
    const query = interaction.options.getString("query") || "";
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [buildCatalogEmbed(query)]
    });
    return;
  }

  const target = interaction.options.getString("target") || interaction.user.username;
  const intensity = clampIntensity(interaction.options.getInteger("intensity") || 3);

  let variantId = null;
  if (sub === "play") {
    variantId = interaction.options.getString("variant", true).toLowerCase();
    const existing = getVariantById(variantId);
    if (!existing) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Unknown variant id. Use `/fun catalog` to browse valid ids."
      });
      return;
    }
  } else {
    variantId = randomVariantId();
  }

  const result = renderFunVariant({
    variantId,
    actorTag: interaction.user.username,
    target,
    intensity
  });

  if (!result.ok) {
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      content: "Failed to render variant. Try again."
    });
    return;
  }

  await interaction.reply({ embeds: [buildFunEmbed(result)] });
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (!focused || (focused.name !== "variant" && focused.name !== "query")) {
    await interaction.respond([]);
    return;
  }

  const hits = findVariants(String(focused.value || ""), 25).map(v => ({
    name: `${v.label} (${v.id})`.slice(0, 100),
    value: v.id
  }));

  await interaction.respond(hits);
}
