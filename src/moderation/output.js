import { EmbedBuilder, MessageFlags } from "discord.js";
import { Colors } from "../utils/discordOutput.js";

function sanitize(text, max = 1024) {
  const value = String(text ?? "").trim();
  if (value.length <= max) return value;
  if (max <= 3) return value.slice(0, Math.max(0, max));
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

export function buildModEmbed({
  title,
  summary,
  color = Colors.INFO,
  fields = [],
  actor = null,
  footer = "Chopsticks Moderation"
} = {}) {
  const embed = new EmbedBuilder()
    .setTitle(sanitize(title || "Moderation"))
    .setDescription(sanitize(summary || "Action completed."))
    .setColor(color)
    .setTimestamp();

  const normalizedFields = [];
  for (const field of Array.isArray(fields) ? fields : []) {
    if (!field || !field.name) continue;
    normalizedFields.push({
      name: sanitize(field.name, 256),
      value: sanitize(field.value ?? "-", 1024),
      inline: Boolean(field.inline)
    });
  }
  if (normalizedFields.length) embed.addFields(normalizedFields.slice(0, 25));

  const footerText = actor ? `${footer} • by ${actor}` : footer;
  embed.setFooter({ text: sanitize(footerText, 2048) });
  return embed;
}

function withFlags(payload, ephemeral = true) {
  return {
    ...payload,
    flags: ephemeral ? MessageFlags.Ephemeral : undefined
  };
}

export async function replyModEmbed(interaction, payload, { ephemeral = true } = {}) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
    return;
  }
  const body = withFlags(payload, ephemeral);
  await interaction.reply(body);
}

export async function replyModSuccess(interaction, {
  title = "Moderation Action Complete",
  summary = "Completed successfully.",
  fields = []
} = {}, { ephemeral = true } = {}) {
  const embed = buildModEmbed({
    title,
    summary,
    color: Colors.SUCCESS,
    fields,
    actor: interaction?.user?.tag || interaction?.user?.username || null
  });
  await replyModEmbed(interaction, { embeds: [embed] }, { ephemeral });
}

export async function replyModError(interaction, {
  title = "Moderation Action Failed",
  summary = "Request could not be completed.",
  fields = []
} = {}, { ephemeral = true } = {}) {
  const embed = buildModEmbed({
    title,
    summary,
    color: Colors.ERROR,
    fields,
    actor: interaction?.user?.tag || interaction?.user?.username || null
  });
  await replyModEmbed(interaction, { embeds: [embed] }, { ephemeral });
}

export function reasonOrDefault(reason) {
  const text = String(reason || "").trim();
  return text || "No reason provided.";
}
