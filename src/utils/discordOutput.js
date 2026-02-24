import { AttachmentBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { renderEmbedCardPng } from "../render/svgCard.js";
import { botLogger } from "./modernLogger.js";
import { Branding } from "../config/branding.js";

// Canonical UI color palette — values sourced from Branding config (overridable via env)
export const Colors = {
  Success: Branding.colors.success,
  Error:   Branding.colors.error,
  Warning: Branding.colors.warning,
  Info:    Branding.colors.info,
  Neutral: Branding.colors.neutral,
  Premium: Branding.colors.premium,
  Music:   Branding.colors.music,
  Danger:  0xFF0000,
  // Legacy keys kept for backward compatibility
  PRIMARY: Branding.colors.primary,
  SUCCESS: Branding.colors.success,
  ERROR:   Branding.colors.error,
  WARNING: Branding.colors.warning,
  INFO:    Branding.colors.info,
};

export function buildEmbed(title, description, color = Colors.PRIMARY) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description ?? "")
    .setColor(color);
}

function normalizeEphemeral(ephemeral = true) {
  return ephemeral ? MessageFlags.Ephemeral : undefined;
}

function svgCardsEnabled() {
  if (process.env.NODE_ENV === "test") return false;
  const raw = String(process.env.SVG_CARDS ?? "true").toLowerCase().trim();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

function embedHasImage(embedLike) {
  const e = embedLike && typeof embedLike === "object" ? embedLike : null;
  const url = e?.data?.image?.url ?? e?.image?.url ?? null;
  return Boolean(url);
}

async function maybeAttachSvgCard(payload) {
  if (!svgCardsEnabled()) return payload;
  if (!payload || typeof payload !== "object") return payload;
  if (payload.files && Array.isArray(payload.files) && payload.files.length) return payload; // Don't interfere with existing file outputs.
  const embeds = Array.isArray(payload.embeds) ? payload.embeds : [];
  if (embeds.length !== 1) return payload;

  let embedObj = embeds[0];
  try {
    if (embedObj?.toJSON) embedObj = embedObj.toJSON();
  } catch {}

  // Respect existing images (e.g., gather.png cards).
  try {
    const eb = EmbedBuilder.from(embedObj);
    if (embedHasImage(eb)) return payload;

    const png = await renderEmbedCardPng(eb.data, { width: 960, height: 540 });
    const fileName = "cs-card.png";
    eb.setImage(`attachment://${fileName}`);

    return {
      ...payload,
      embeds: [eb],
      files: [new AttachmentBuilder(png, { name: fileName })]
    };
  } catch (err) {
    // Never block a response on visuals.
    botLogger.warn({ err }, "[svg-cards] render failed");
    return payload;
  }
}

async function sendInteractionResponse(interaction, payload, ephemeral = true) {
  const base = await maybeAttachSvgCard({ ...payload });
  const flags = normalizeEphemeral(ephemeral);

  if (interaction.deferred) {
    return interaction.editReply(base);
  }
  if (interaction.replied) {
    return interaction.followUp({ ...base, flags });
  }
  return interaction.reply({ ...base, flags });
}

/**
 * Creates a standardized EmbedBuilder instance with common options.
 */
export function makeEmbed(title, description, fields = [], url = null, thumbnail_url = null, color = Colors.PRIMARY, footer = null) {
  const e = new EmbedBuilder().setTitle(title).setDescription(description ?? "").setColor(color);
  if (Array.isArray(fields) && fields.length) e.addFields(fields);
  if (url) e.setURL(url);
  if (thumbnail_url) e.setThumbnail(thumbnail_url);
  if (footer) e.setFooter(footer);
  return e;
}

export function replyEmbed(interaction, title, description, ephemeral = true, color = Colors.PRIMARY) {
  return sendInteractionResponse(interaction, {
    embeds: [buildEmbed(title, description, color)]
  }, ephemeral);
}

export function replySuccess(interaction, titleOrDescription, descriptionOrEphemeral = true, maybeEphemeral = true) {
  let title = "Success";
  let description = String(titleOrDescription ?? "");
  let ephemeral = descriptionOrEphemeral;

  if (typeof descriptionOrEphemeral === "string") {
    title = String(titleOrDescription ?? "Success");
    description = descriptionOrEphemeral;
    ephemeral = maybeEphemeral;
  }

  return sendInteractionResponse(interaction, {
    embeds: [buildEmbed(title, description, Colors.Success)]
  }, Boolean(ephemeral));
}

export function replyError(interaction, titleOrDescription, descriptionOrEphemeral = true, maybeEphemeral = true) {
  let title = "Error";
  let description = String(titleOrDescription ?? "");
  let ephemeral = descriptionOrEphemeral;

  if (typeof descriptionOrEphemeral === "string") {
    title = String(titleOrDescription ?? "Error");
    description = descriptionOrEphemeral;
    ephemeral = maybeEphemeral;
  }

  return sendInteractionResponse(interaction, {
    embeds: [buildEmbed(title, description, Colors.Error)]
  }, Boolean(ephemeral));
}

export function replyEmbedWithJson(interaction, title, description, data, filename = "data.json") {
  const payload = JSON.stringify(data ?? {}, null, 2);
  const file = new AttachmentBuilder(Buffer.from(payload, "utf8"), { name: filename });
  return sendInteractionResponse(interaction, {
    embeds: [buildEmbed(title, description)],
    files: [file]
  }, true);
}

export function makeTypedEmbed(type, title, description, fields = []) {
  const colorMap = {
    success: Colors.Success,
    error:   Colors.Error,
    warning: Colors.Warning,
    info:    Colors.Info,
    neutral: Colors.Neutral,
    music:   Colors.Music,
  };
  const color = colorMap[type] ?? Colors.Info;
  return new EmbedBuilder().setColor(color).setTitle(title).setDescription(description || null).addFields(fields);
}
