import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits
} from "discord.js";
import {
  clampIntensity,
  findVariants
} from "../fun/variants.js";
import {
  getFunCatalog,
  getFunRuntimeConfig,
  randomFunFromRuntime,
  renderFunFromRuntime,
  resolveVariantId
} from "../fun/runtime.js";
import {
  formatGuildFunConfig,
  getGuildFunConfig,
  setGuildFunConfig
} from "../fun/integrations.js";

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
  )
  .addSubcommand(s =>
    s
      .setName("settings")
      .setDescription("Configure automatic FunHub flavor integrations for this server")
      .addStringOption(o =>
        o
          .setName("mode")
          .setDescription("Auto text style for integrations")
          .addChoices(
            { name: "off (disable auto lines)", value: "off" },
            { name: "clean (practical)", value: "clean" },
            { name: "creative (flavor)", value: "creative" }
          )
      )
      .addBooleanOption(o => o.setName("enabled").setDescription("Enable/disable all auto fun outputs"))
      .addBooleanOption(o => o.setName("welcome").setDescription("Enable fun flavor in welcome messages"))
      .addBooleanOption(o => o.setName("giveaway").setDescription("Enable fun flavor in giveaway posts"))
      .addBooleanOption(o => o.setName("daily").setDescription("Enable fun flavor in /daily results"))
      .addBooleanOption(o => o.setName("work").setDescription("Enable fun flavor in /work results"))
      .addIntegerOption(o =>
        o
          .setName("intensity")
          .setDescription("Default intensity for auto flavor (1-5)")
          .setMinValue(1)
          .setMaxValue(5)
      )
  );

function buildFunEmbed(result) {
  const variantName = result?.variant?.label || result?.variantId || "unknown";
  return new EmbedBuilder()
    .setTitle(`Fun Variant: ${variantName}`)
    .setColor(0x3ba55d)
    .setDescription(String(result.text || "No output."))
    .addFields(
      { name: "Variant", value: `\`${result?.variant?.id || result.variantId || "unknown"}\``, inline: true },
      { name: "Intensity", value: String(result.intensity ?? 3), inline: true },
      { name: "Source", value: String(result.source || "local"), inline: true }
    )
    .setFooter({ text: String(result.metaLine || "Fun output") });
}

function buildCatalogEmbed(payload, query = "") {
  const stats = payload?.stats || { total: payload?.total || 0, themes: "?", styles: "?" };
  const hits = Array.isArray(payload?.matches) ? payload.matches : [];
  const lines = hits.map(v => `- \`${v.id}\` -> ${v.label}`);
  const sample = (Array.isArray(payload?.sample) ? payload.sample : []).map(v => `\`${v}\``).join(", ");
  const runtime = getFunRuntimeConfig();

  return new EmbedBuilder()
    .setTitle("Fun Catalog")
    .setColor(0x00a8ff)
    .setDescription(
      `Total variants: **${stats.total}** (${stats.themes} themes x ${stats.styles} styles)\n` +
      `Use \`/fun play variant:<id>\` or \`/fun random\`.\n` +
      (query ? `Search query: \`${query}\`\n` : "") +
      (sample ? `Sample ids: ${sample}\n` : "") +
      `Provider mode: \`${runtime.provider}\` | Source: \`${payload?.source || "local"}\``
    )
    .addFields({
      name: "Matching Variants",
      value: lines.length ? lines.join("\n") : "No matches found."
    });
}

function buildSettingsEmbed(config) {
  const runtime = getFunRuntimeConfig();
  return new EmbedBuilder()
    .setTitle("Fun Integration Settings")
    .setColor(0x2ecc71)
    .setDescription(
      "These settings control where automatic FunHub flavor lines appear in this guild."
    )
    .addFields(
      { name: "Status", value: config.enabled ? "enabled" : "disabled", inline: true },
      { name: "Mode", value: String(config.mode || "clean"), inline: true },
      { name: "Intensity", value: String(config.intensity), inline: true },
      { name: "Provider", value: runtime.provider, inline: true },
      {
        name: "Features",
        value:
          `welcome=${config.features.welcome}\n` +
          `giveaway=${config.features.giveaway}\n` +
          `daily=${config.features.daily}\n` +
          `work=${config.features.work}`
      }
    )
    .setFooter({ text: formatGuildFunConfig(config) });
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand(true);

  if (sub === "settings") {
    if (!interaction.inGuild()) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "This subcommand can only be used in a server."
      });
      return;
    }
    if (!interaction.memberPermissions?.has?.(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Manage Server permission is required."
      });
      return;
    }

    const enabled = interaction.options.getBoolean("enabled");
    const welcome = interaction.options.getBoolean("welcome");
    const giveaway = interaction.options.getBoolean("giveaway");
    const daily = interaction.options.getBoolean("daily");
    const work = interaction.options.getBoolean("work");
    const mode = interaction.options.getString("mode");
    const intensityOpt = interaction.options.getInteger("intensity");
    const hasPatch =
      mode !== null ||
      enabled !== null ||
      welcome !== null ||
      giveaway !== null ||
      daily !== null ||
      work !== null ||
      intensityOpt !== null;

    if (!hasPatch) {
      const current = await getGuildFunConfig(interaction.guildId);
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        embeds: [buildSettingsEmbed(current.config)]
      });
      return;
    }

    const patch = {};
    if (enabled !== null) patch.enabled = enabled;
    if (mode !== null) patch.mode = mode;
    if (intensityOpt !== null) patch.intensity = clampIntensity(intensityOpt);
    const featurePatch = {};
    if (welcome !== null) featurePatch.welcome = welcome;
    if (giveaway !== null) featurePatch.giveaway = giveaway;
    if (daily !== null) featurePatch.daily = daily;
    if (work !== null) featurePatch.work = work;
    if (Object.keys(featurePatch).length) patch.features = featurePatch;

    const updated = await setGuildFunConfig(interaction.guildId, patch);
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [buildSettingsEmbed(updated.config)]
    });
    return;
  }

  if (sub === "catalog") {
    const query = interaction.options.getString("query") || "";
    const payload = await getFunCatalog({ query, limit: 20 });
    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [buildCatalogEmbed(payload, query)]
    });
    return;
  }

  const target = interaction.options.getString("target") || interaction.user.username;
  const intensity = clampIntensity(interaction.options.getInteger("intensity") || 3);

  let result = null;
  if (sub === "play") {
    const requested = interaction.options.getString("variant", true).toLowerCase();
    const variantId = resolveVariantId(requested);
    if (!variantId) {
      await interaction.reply({
        flags: MessageFlags.Ephemeral,
        content: "Unknown variant id. Use `/fun catalog` to browse valid ids."
      });
      return;
    }
    result = await renderFunFromRuntime({
      variantId,
      actorTag: interaction.user.username,
      target,
      intensity
    });
  } else {
    result = await randomFunFromRuntime({
      actorTag: interaction.user.username,
      target,
      intensity
    });
  }

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
