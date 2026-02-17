// src/tools/voice/customVcsUi.js
// Discord-facing UI + interactions for Custom VCs.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { randomBytes } from "node:crypto";

import { getVoiceState, saveVoiceState } from "./schema.js";
import { auditLog } from "../../utils/audit.js";
import {
  ensureCustomVcsState,
  getCustomVcConfig,
  getCustomRoom,
  findUserCustomRooms,
  upsertCustomRoom,
  patchCustomRoom,
  removeCustomRoom
} from "./customVcsState.js";

const PREFIX = "customvc";
const PENDING_TTL_MS = 5 * 60 * 1000;
const pending = new Map(); // nonce -> { guildId, userId, name, limit, bitrateKbps, createdAt, expiresAt }

function id(...parts) {
  return `${PREFIX}:${parts.join(":")}`;
}

function parseId(customId) {
  const parts = String(customId || "").split(":");
  if (parts[0] !== PREFIX) return null;
  return parts.slice(1);
}

function isSnowflake(value) {
  return /^\d{16,21}$/.test(String(value || ""));
}

function safeName(value, fallback) {
  const s = String(value || "").trim().replace(/\s+/g, " ");
  return (s || fallback || "Custom VC").slice(0, 90);
}

function safeInt(value, { min, max, fallback }) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const t = Math.trunc(n);
  if (t < min) return min;
  if (t > max) return max;
  return t;
}

function hasManageGuildPerms(perms) {
  return Boolean(
    perms?.has?.(PermissionFlagsBits.ManageGuild) ||
    perms?.has?.(PermissionFlagsBits.Administrator)
  );
}

function hasAnyRole(member, roleIds) {
  const ids = Array.isArray(roleIds) ? roleIds : [];
  if (!ids.length) return false;
  const cache = member?.roles?.cache;
  if (cache?.has) {
    for (const rid of ids) if (cache.has(rid)) return true;
  }
  return false;
}

function extractUserIds(text) {
  const out = [];
  const seen = new Set();
  const raw = String(text || "").trim();
  if (!raw) return out;
  const mentionRe = /<@!?(\d{16,21})>/g;
  for (const match of raw.matchAll(mentionRe)) {
    const id = match?.[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const token of raw.split(/\s+/g)) {
    const t = token.trim();
    if (!/^\d{16,21}$/.test(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function nonce() {
  return randomBytes(8).toString("hex");
}

function takePending(n) {
  const rec = pending.get(n);
  if (!rec) return null;
  if (rec.expiresAt && Date.now() > rec.expiresAt) {
    pending.delete(n);
    return null;
  }
  return rec;
}

function inGuildFlags(interaction) {
  return interaction.inGuild?.() ? { flags: MessageFlags.Ephemeral } : {};
}

async function resolveGuildCtx(interaction, guildId = null) {
  const gid = String(guildId || interaction.guildId || "").trim();
  if (!gid) return null;

  const client = interaction.client;
  const guild = interaction.guild ?? (await client.guilds.fetch(gid).catch(() => null));
  if (!guild) return null;

  const member =
    guild.members.cache.get(interaction.user.id) ??
    (await guild.members.fetch(interaction.user.id).catch(() => null));
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

  return { guild, member, me, guildId: guild.id };
}

async function canManageRoom(interaction, roomRecord, cfg, guildCtx = null) {
  const ctx = guildCtx ?? (await resolveGuildCtx(interaction, guildCtx?.guildId));
  if (!ctx?.guild || !ctx.member) return false;
  if (hasManageGuildPerms(ctx.member.permissions)) return true;
  if (roomRecord?.ownerId && interaction.user?.id && String(roomRecord.ownerId) === String(interaction.user.id)) return true;
  // Voice mods can join; management stays owner/admin by default.
  if (hasAnyRole(ctx.member, cfg?.modRoleIds)) return false;
  return false;
}

function panelEmbed({ cfg }) {
  const enabled = cfg.enabled ? "Enabled" : "Disabled";
  const modeLine = cfg.enabled
    ? "Click **Request Custom VC** to start. You will be prompted in DM by default."
    : "An admin must enable Custom VCs first (`/voice customs_setup enabled:true`).";

  return new EmbedBuilder()
    .setTitle("Custom VCs")
    .setDescription(
      [
        modeLine,
        "",
        "**What you can set:**",
        "• Name",
        "• Public or private",
        "• Guestlist (private)",
        "• VC size (user limit)",
        "• Bitrate (within server limits)",
        "• Deny specific users from joining or speaking",
        "",
        "**Public**: anyone can join.",
        "**Private**: only you, your guestlist, and Voice Mods can join.",
        "",
        "**Disclaimer**",
        "Server rules still apply. Voice Mods may join any Custom VC when needed.",
        "Customs are deleted when the host leaves."
      ].join("\n")
    )
    .addFields(
      { name: "Status", value: enabled, inline: true },
      { name: "Max Rooms Per User", value: String(cfg.maxRoomsPerUser || 1), inline: true }
    )
    .setFooter({ text: "In development" });
}

function panelComponents({ disabled = false } = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(id("req"))
        .setLabel("Request Custom VC")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(id("help")).setLabel("How It Works").setStyle(ButtonStyle.Secondary)
    )
  ];
}

export function buildCustomVcPanelMessage(cfg) {
  return {
    embeds: [panelEmbed({ cfg })],
    components: panelComponents({ disabled: !cfg.enabled })
  };
}

function privacyPromptEmbed({ guildName, requestedName }) {
  const titleName = requestedName ? `“${requestedName}”` : "your Custom VC";
  return new EmbedBuilder()
    .setTitle("Custom VC Privacy")
    .setDescription(
      [
        `Do you want to make ${titleName} **public** or **private**?`,
        "",
        "**Public**: anyone can join.",
        "**Private**: only users on your guestlist can join (plus Voice Mods).",
        "",
        "You can change this later."
      ].join("\n")
    )
    .setFooter({ text: guildName ? `Server: ${guildName}` : "Custom VCs" });
}

function privacyPromptComponents(n, userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(id("pv", n, userId, "public")).setLabel("Public").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(id("pv", n, userId, "private")).setLabel("Private").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(id("cancel", n, userId)).setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    )
  ];
}

function makeManageButtonRow({ guildId, channelId, ownerId, page = "main" }) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(id("manage", guildId, channelId, ownerId, page))
        .setLabel("Open Controls")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function createRequestModal(guildId) {
  const modal = new ModalBuilder()
    .setCustomId(id("modal", "create", String(guildId || "")))
    .setTitle("Custom VC Request");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("name")
        .setLabel("Channel Name")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(90)
        .setPlaceholder("e.g., ChillZone")
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("limit")
        .setLabel("VC Size (0 = unlimited)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("e.g., 10")
        .setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId("bitrate")
        .setLabel("Bitrate kbps (blank = default)")
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder("e.g., 64")
        .setMaxLength(4)
    )
  );

  return modal;
}

function editRoomModal(guildId, channelId, ownerId, { name, limit, bitrateKbps } = {}) {
  const modal = new ModalBuilder()
    .setCustomId(id("modal", "edit", String(guildId || ""), channelId, ownerId))
    .setTitle("Edit Custom VC");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setLabel("Channel Name")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(90)
    .setPlaceholder("e.g., ChillZone");
  if (name) nameInput.setValue(String(name).slice(0, 90));

  const limitInput = new TextInputBuilder()
    .setCustomId("limit")
    .setLabel("VC Size (0 = unlimited)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("e.g., 10")
    .setMaxLength(3);
  if (Number.isFinite(limit)) limitInput.setValue(String(limit));

  const bitrateInput = new TextInputBuilder()
    .setCustomId("bitrate")
    .setLabel("Bitrate kbps (blank = keep)")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder("e.g., 64")
    .setMaxLength(4);
  if (Number.isFinite(bitrateKbps)) bitrateInput.setValue(String(bitrateKbps));

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(limitInput),
    new ActionRowBuilder().addComponents(bitrateInput)
  );
  return modal;
}

function idListModal(guildId, channelId, ownerId, action, title, label, placeholder, initial = "") {
  const modal = new ModalBuilder()
    .setCustomId(id("modal", action, String(guildId || ""), channelId, ownerId))
    .setTitle(title);

  const input = new TextInputBuilder()
    .setCustomId("ids")
    .setLabel(label)
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setPlaceholder(placeholder)
    .setMaxLength(2000);
  if (initial) input.setValue(String(initial).slice(0, 2000));

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function roomSummaryEmbed({ channel, record, cfg }) {
  const privacy = record.privacy === "private" ? "Private" : "Public";
  const guests = Array.isArray(record.guestIds) ? record.guestIds : [];
  const denyJoin = Array.isArray(record.denyJoinIds) ? record.denyJoinIds : [];
  const denySpeak = Array.isArray(record.denySpeakIds) ? record.denySpeakIds : [];
  const limit = Number.isFinite(channel?.userLimit) ? channel.userLimit : 0;
  const bitrateKbps = Number.isFinite(channel?.bitrate) ? Math.trunc(channel.bitrate / 1000) : null;

  const guestLine = guests.length ? `${guests.length} user(s)` : "none";
  const denyJoinLine = denyJoin.length ? `${denyJoin.length} user(s)` : "none";
  const denySpeakLine = denySpeak.length ? `${denySpeak.length} user(s)` : "none";

  return new EmbedBuilder()
    .setTitle("Custom VC Controls")
    .setDescription(`Room: <#${channel.id}>`)
    .addFields(
      { name: "Host", value: `<@${record.ownerId}>`, inline: true },
      { name: "Privacy", value: privacy, inline: true },
      { name: "VC Size", value: limit ? String(limit) : "unlimited", inline: true },
      {
        name: "Bitrate",
        value: bitrateKbps
          ? `${bitrateKbps}kbps`
          : (cfg.defaultBitrateKbps ? `${cfg.defaultBitrateKbps}kbps (default)` : "default"),
        inline: true
      },
      { name: "Guestlist", value: guestLine, inline: true },
      { name: "Denied Join", value: denyJoinLine, inline: true },
      { name: "Denied Speak", value: denySpeakLine, inline: true }
    )
    .setFooter({ text: "In development | Customs are deleted when the host leaves." });
}

function manageComponents({ guildId, channelId, ownerId, record, page = "main" }) {
  const isPrivate = record.privacy === "private";
  const rows = [];

  if (page === "main") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "settings")).setLabel("Settings").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "guests")).setLabel("Guestlist").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "bans")).setLabel("Restrictions").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id("refresh", guildId, channelId, ownerId, "main")).setLabel("Refresh").setStyle(ButtonStyle.Secondary)
      )
    );
    return rows;
  }

  if (page === "settings") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("privacy", guildId, channelId, ownerId, "public")).setLabel("Make Public").setStyle(ButtonStyle.Secondary).setDisabled(!isPrivate),
        new ButtonBuilder().setCustomId(id("privacy", guildId, channelId, ownerId, "private")).setLabel("Make Private").setStyle(ButtonStyle.Secondary).setDisabled(isPrivate),
        new ButtonBuilder().setCustomId(id("edit", guildId, channelId, ownerId)).setLabel("Rename / Size / Bitrate").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(id("delete", guildId, channelId, ownerId)).setLabel("Delete Room").setStyle(ButtonStyle.Danger)
      )
    );
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "main")).setLabel("Back").setStyle(ButtonStyle.Secondary)
      )
    );
    return rows;
  }

  if (page === "guests") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("guests", guildId, channelId, ownerId)).setLabel("Edit Guestlist").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(id("privacy", guildId, channelId, ownerId, "private")).setLabel("Make Private").setStyle(ButtonStyle.Secondary).setDisabled(isPrivate)
      )
    );
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "main")).setLabel("Back").setStyle(ButtonStyle.Secondary)
      )
    );
    return rows;
  }

  if (page === "bans") {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("banjoin", guildId, channelId, ownerId)).setLabel("Edit Deny Join").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id("banspeak", guildId, channelId, ownerId)).setLabel("Edit Deny Speak").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(id("refresh", guildId, channelId, ownerId, "bans")).setLabel("Refresh").setStyle(ButtonStyle.Secondary)
      )
    );
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(id("page", guildId, channelId, ownerId, "main")).setLabel("Back").setStyle(ButtonStyle.Secondary)
      )
    );
    return rows;
  }

  return manageComponents({ guildId, channelId, ownerId, record, page: "main" });
}

async function applyOverwrites(guild, channel, record, cfg) {
  const ownerId = String(record.ownerId || "");
  const privacy = record.privacy === "private" ? "private" : "public";
  const everyoneId = guild.roles.everyone.id;
  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));

  const overwrites = [];
  if (privacy === "private") {
    overwrites.push({ id: everyoneId, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] });
  } else {
    overwrites.push({ id: everyoneId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] });
  }

  if (me?.id) {
    overwrites.push({
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers
      ]
    });
  }

  if (isSnowflake(ownerId)) {
    overwrites.push({
      id: ownerId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.MuteMembers,
        PermissionFlagsBits.DeafenMembers
      ]
    });
  }

  for (const roleId of Array.isArray(cfg.modRoleIds) ? cfg.modRoleIds : []) {
    overwrites.push({
      id: roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak
      ]
    });
  }

  for (const uid of Array.isArray(record.guestIds) ? record.guestIds : []) {
    overwrites.push({
      id: uid,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    });
  }

  for (const uid of Array.isArray(record.denyJoinIds) ? record.denyJoinIds : []) {
    if (!isSnowflake(uid)) continue;
    if (uid === ownerId) continue;
    overwrites.push({
      id: uid,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
    });
  }

  for (const uid of Array.isArray(record.denySpeakIds) ? record.denySpeakIds : []) {
    if (!isSnowflake(uid)) continue;
    if (uid === ownerId) continue;
    overwrites.push({
      id: uid,
      deny: [PermissionFlagsBits.Speak]
    });
  }

  await channel.permissionOverwrites.set(overwrites).catch(() => {});
}

async function renderManage(interaction, { guildId, channelId, ownerId, page = "main", update = false, note = "" } = {}) {
  const ctx = await resolveGuildCtx(interaction, guildId);
  const guild = ctx?.guild;
  if (!guild) {
    const payload = {
      embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("Unable to resolve server context.").setColor(0xef4444)],
      ...(update ? {} : inGuildFlags(interaction))
    };
    if (update) await interaction.update({ embeds: payload.embeds, components: [] }).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
    return true;
  }

  const voice = await getVoiceState(guild.id);
  ensureCustomVcsState(voice);
  const cfg = getCustomVcConfig(voice);
  const record = getCustomRoom(voice, channelId);
  if (!record) {
    const payload = {
      embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("This custom room is no longer tracked.").setColor(0xef4444)],
      ...(update ? {} : inGuildFlags(interaction))
    };
    if (update) await interaction.update({ embeds: payload.embeds, components: [] }).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
    return true;
  }

  const channel =
    guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel) {
    await removeCustomRoom(guild.id, channelId, voice).catch(() => {});
    const payload = {
      embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("Room channel no longer exists.").setColor(0xf59e0b)],
      ...(update ? {} : inGuildFlags(interaction))
    };
    if (update) await interaction.update({ embeds: payload.embeds, components: [] }).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
    return true;
  }

  if (!(await canManageRoom(interaction, record, cfg, ctx))) {
    const payload = {
      embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can manage this Custom VC.").setColor(0xef4444)],
      ...(update ? {} : inGuildFlags(interaction))
    };
    if (update) await interaction.update({ embeds: payload.embeds, components: [] }).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
    return true;
  }

  const embed = roomSummaryEmbed({ channel, record, cfg });
  if (note) embed.addFields({ name: "Update", value: String(note).slice(0, 1024), inline: false });

  const payload = {
    embeds: [embed],
    components: manageComponents({ guildId: guild.id, channelId, ownerId, record, page })
  };

  if (update) await interaction.update(payload).catch(() => {});
  else await interaction.reply({ ...payload, ...inGuildFlags(interaction) }).catch(() => {});
  return true;
}

async function createRoomForUser(client, { guildId, userId, privacy, name, limit, bitrateKbps } = {}) {
  const guild = await client.guilds.fetch(String(guildId)).catch(() => null);
  if (!guild) return { ok: false, error: "guild-not-found", detail: "Server not found." };
  const member =
    guild.members.cache.get(String(userId)) ??
    (await guild.members.fetch(String(userId)).catch(() => null));
  if (!member) return { ok: false, error: "member-not-found", detail: "Member not found in that server." };

  const voice = await getVoiceState(guild.id);
  ensureCustomVcsState(voice);
  const cfg = getCustomVcConfig(voice);

  if (!cfg.enabled) return { ok: false, error: "disabled", detail: "Custom VCs are disabled." };
  if (!cfg.categoryId) return { ok: false, error: "missing-category", detail: "Custom VC category is not configured." };

  const category =
    guild.channels.cache.get(cfg.categoryId) ?? (await guild.channels.fetch(cfg.categoryId).catch(() => null));
  if (!category || category.type !== ChannelType.GuildCategory) {
    return { ok: false, error: "bad-category", detail: "Configured category is missing or invalid." };
  }

  const me = guild.members.me ?? (await guild.members.fetchMe().catch(() => null));
  if (me) {
    const perms = category.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.ManageChannels)) {
      return { ok: false, error: "bot-missing-perms", detail: "Bot is missing Manage Channels in the custom VC category." };
    }
  }

  const existing = findUserCustomRooms(voice, userId);
  if (existing.length >= (cfg.maxRoomsPerUser || 1)) {
    const first = existing[0];
    return {
      ok: false,
      error: "limit",
      detail: `You already have a custom VC: <#${first.channelId}>.`,
      channelId: first.channelId
    };
  }

  const ownerId = member.user.id;
  const fallbackName = `custom-${member.displayName ?? member.user.username}`;
  const channelName = safeName(name, fallbackName);
  const userLimit = safeInt(limit, { min: 0, max: 99, fallback: cfg.defaultUserLimit || 0 });

  const maxBitrateKbps = Number.isFinite(guild.maximumBitrate)
    ? Math.max(8, Math.trunc(guild.maximumBitrate / 1000))
    : 512;
  const requestedBr =
    bitrateKbps === "" || bitrateKbps == null
      ? cfg.defaultBitrateKbps
      : safeInt(bitrateKbps, { min: 8, max: 512, fallback: cfg.defaultBitrateKbps });
  const br = requestedBr ? Math.min(requestedBr, maxBitrateKbps) : null;

  const record = {
    ownerId,
    privacy: privacy === "private" ? "private" : "public",
    guestIds: [],
    denyJoinIds: [],
    denySpeakIds: [],
    createdAt: Date.now()
  };

  try {
    const created = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: category.id,
      userLimit: userLimit || 0,
      bitrate: br ? br * 1000 : undefined,
      permissionOverwrites: []
    });

    await applyOverwrites(guild, created, record, cfg);
    const saved = await upsertCustomRoom(guild.id, created.id, record, voice);
    if (!saved.ok) {
      await created.delete().catch(() => {});
      return { ok: false, error: "persist-failed", detail: "Failed to persist custom room." };
    }

    await auditLog({
      guildId: guild.id,
      userId: ownerId,
      action: "voice.customvc.create",
      details: { channelId: created.id, privacy: record.privacy, userLimit: userLimit || 0, bitrateKbps: br }
    }).catch(() => {});

    // Move creator into the channel if they are already in voice.
    try {
      if (member.voice?.channelId && member.voice.channelId !== created.id) {
        await member.voice.setChannel(created).catch(() => {});
      }
    } catch {}

    return { ok: true, guild, member, channel: created, record: saved.record, cfg };
  } catch (err) {
    return { ok: false, error: "create-failed", detail: String(err?.message || err) };
  }
}

async function resolveRoomAndConfig(interaction, guildId, channelId) {
  const ctx = await resolveGuildCtx(interaction, guildId);
  const guild = ctx?.guild;
  if (!guild) return { ok: false, error: "guild-not-found" };

  const voice = await getVoiceState(guild.id);
  ensureCustomVcsState(voice);
  const cfg = getCustomVcConfig(voice);
  const record = getCustomRoom(voice, channelId);
  if (!record) return { ok: false, error: "room-not-found", guild, voice, cfg, ctx };

  const channel =
    guild.channels.cache.get(channelId) ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel) {
    await removeCustomRoom(guild.id, channelId, voice).catch(() => {});
    return { ok: false, error: "channel-missing", guild, voice, cfg, ctx };
  }

  return { ok: true, guild, voice, cfg, record, channel, ctx };
}

export async function handleCustomVcButton(interaction) {
  if (!interaction.isButton?.()) return false;
  const parts = parseId(interaction.customId);
  if (!parts) return false;

  const kind = parts[0];

  if (kind === "help") {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Custom VCs: Help")
          .setDescription(
            [
              "1) Press **Request Custom VC** and fill the form.",
              "2) Choose **Public** or **Private** (DM prompt by default).",
              "3) Use **Open Controls** to manage privacy, guestlist, and restrictions.",
              "",
              "Voice Mods can always join private rooms.",
              "Custom rooms are deleted when the host leaves."
            ].join("\n")
          )
      ],
      ...inGuildFlags(interaction)
    });
    return true;
  }

  if (kind === "req") {
    if (!interaction.inGuild?.()) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Guild Only").setDescription("Custom VCs must be used inside a server.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }

    const voice = await getVoiceState(interaction.guildId);
    ensureCustomVcsState(voice);
    const cfg = getCustomVcConfig(voice);
    if (!cfg.enabled) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VCs Disabled").setDescription("An admin must enable this feature first.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }
    if (!cfg.categoryId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VCs Not Set Up").setDescription("An admin must configure a category first (`/voice customs_setup category:...`).").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }

    const existing = findUserCustomRooms(voice, interaction.user.id);
    if (existing.length >= (cfg.maxRoomsPerUser || 1)) {
      const first = existing[0];
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Custom VC Limit Reached")
            .setDescription(`You already have a Custom VC: <#${first.channelId}>.`)
            .setColor(0xf59e0b)
        ],
        components: makeManageButtonRow({ guildId: interaction.guildId, channelId: first.channelId, ownerId: interaction.user.id }),
        ...inGuildFlags(interaction)
      });
      return true;
    }

    await interaction.showModal(createRequestModal(interaction.guildId));
    return true;
  }

  if (kind === "cancel") {
    const n = parts[1];
    const userId = parts[2];
    if (!n || !isSnowflake(userId)) return false;
    if (interaction.user.id !== userId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Not For You").setDescription("This prompt belongs to another user.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }
    pending.delete(n);
    await interaction.update({
      embeds: [new EmbedBuilder().setTitle("Custom VC Request Canceled").setDescription("No room was created.").setColor(0x64748b)],
      components: []
    }).catch(async () => {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Canceled").setDescription("No room was created.").setColor(0x64748b)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
    });
    return true;
  }

  if (kind === "pv") {
    const n = parts[1];
    const userId = parts[2];
    const privacy = parts[3] === "private" ? "private" : "public";
    if (!n || !isSnowflake(userId)) return false;
    if (interaction.user.id !== userId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Not For You").setDescription("This prompt belongs to another user.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }

    const rec = takePending(n);
    if (!rec || rec.userId !== userId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Expired").setDescription("This request expired. Please request again.").setColor(0xf59e0b)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }
    pending.delete(n);

    const created = await createRoomForUser(interaction.client, { ...rec, privacy });
    if (!created.ok) {
      const embed = new EmbedBuilder()
        .setTitle("Custom VC Failed")
        .setDescription(created.detail || created.error || "Unknown error")
        .setColor(0xef4444);
      if (created.channelId) embed.addFields({ name: "Existing Room", value: `<#${created.channelId}>`, inline: false });

      await interaction.update({ embeds: [embed], components: [] }).catch(async () => {
        await interaction.reply({ embeds: [embed], ...inGuildFlags(interaction) }).catch(() => {});
      });
      return true;
    }

    const channel = created.channel;
    const roomRecord = created.record;
    const embed = new EmbedBuilder()
      .setTitle("Custom VC Created")
      .setDescription(
        [
          `Created <#${channel.id}> (${roomRecord.privacy}).`,
          roomRecord.privacy === "private" ? "Next: open controls to set your guestlist." : ""
        ].filter(Boolean).join("\n")
      )
      .setColor(0x22c55e);

    await interaction.update({
      embeds: [embed],
      components: makeManageButtonRow({ guildId: created.guild.id, channelId: channel.id, ownerId: roomRecord.ownerId })
    }).catch(async () => {
      await interaction.reply({
        embeds: [embed],
        components: makeManageButtonRow({ guildId: created.guild.id, channelId: channel.id, ownerId: roomRecord.ownerId }),
        ...inGuildFlags(interaction)
      }).catch(() => {});
    });

    return true;
  }

  if (kind === "manage") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    const page = parts[4] || "main";
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;
    return renderManage(interaction, { guildId, channelId, ownerId, page, update: false });
  }

  if (kind === "refresh") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    const page = parts[4] || "main";
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;
    return renderManage(interaction, { guildId, channelId, ownerId, page, update: true, note: "Refreshed." });
  }

  if (kind === "page") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    const page = parts[4] || "main";
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;
    if (!["main", "settings", "guests", "bans"].includes(page)) return false;
    return renderManage(interaction, { guildId, channelId, ownerId, page, update: true });
  }

  if (kind === "privacy") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    const next = parts[4] === "private" ? "private" : "public";
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) {
      const msg = res.error === "channel-missing"
        ? "Channel missing; cleaned up record."
        : "Room record missing.";
      return renderManage(interaction, { guildId, channelId, ownerId, page: "settings", update: true, note: msg });
    }
    const { guild, voice, cfg, record, channel, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can change privacy.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    const patched = await patchCustomRoom(guild.id, channelId, { privacy: next }, voice);
    if (patched.ok) {
      await applyOverwrites(guild, channel, patched.record, cfg);
      await auditLog({
        guildId: guild.id,
        userId: interaction.user.id,
        action: "voice.customvc.privacy",
        details: { channelId, privacy: next }
      }).catch(() => {});
      return renderManage(interaction, { guildId, channelId, ownerId, page: "settings", update: true, note: `Privacy set to ${next}.` });
    }
    return renderManage(interaction, { guildId, channelId, ownerId, page: "settings", update: true, note: "Failed to update privacy." });
  }

  if (kind === "edit") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) return renderManage(interaction, { guildId, channelId, ownerId, page: "settings", update: true, note: "Room missing." });
    const { cfg, record, channel, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can edit this room.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    const bitrateKbps = Number.isFinite(channel?.bitrate) ? Math.trunc(channel.bitrate / 1000) : null;
    const limit = Number.isFinite(channel?.userLimit) ? channel.userLimit : null;
    await interaction.showModal(editRoomModal(guildId, channelId, ownerId, { name: channel?.name, limit, bitrateKbps }));
    return true;
  }

  if (kind === "guests" || kind === "banjoin" || kind === "banspeak") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) return renderManage(interaction, { guildId, channelId, ownerId, page: "main", update: true, note: "Room missing." });
    const { cfg, record, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can manage this room.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    if (kind === "guests") {
      const initial = (record.guestIds || []).slice(0, 30).map(uid => `<@${uid}>`).join(" ");
      await interaction.showModal(
        idListModal(
          guildId,
          channelId,
          ownerId,
          "guests",
          "Guestlist",
          "Allowed users (mentions or IDs)",
          "Paste user mentions/IDs separated by spaces. Leave blank to clear.",
          initial
        )
      );
      return true;
    }

    if (kind === "banjoin") {
      const initial = (record.denyJoinIds || []).slice(0, 30).map(uid => `<@${uid}>`).join(" ");
      await interaction.showModal(
        idListModal(
          guildId,
          channelId,
          ownerId,
          "banjoin",
          "Deny Join",
          "Users denied from joining (mentions or IDs)",
          "Paste user mentions/IDs separated by spaces. Leave blank to clear.",
          initial
        )
      );
      return true;
    }

    const initial = (record.denySpeakIds || []).slice(0, 30).map(uid => `<@${uid}>`).join(" ");
    await interaction.showModal(
      idListModal(
        guildId,
        channelId,
        ownerId,
        "banspeak",
        "Deny Speak",
        "Users denied from speaking (mentions or IDs)",
        "Paste user mentions/IDs separated by spaces. Leave blank to clear.",
        initial
      )
    );
    return true;
  }

  if (kind === "delete") {
    const guildId = parts[1];
    const channelId = parts[2];
    const ownerId = parts[3];
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) {
      await interaction.update({
        embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("Room missing.").setColor(0xf59e0b)],
        components: []
      }).catch(() => {});
      return true;
    }
    const { guild, voice, cfg, record, channel, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can delete this room.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    await channel.delete().catch(() => {});
    await removeCustomRoom(guild.id, channelId, voice).catch(() => {});
    await auditLog({
      guildId: guild.id,
      userId: interaction.user.id,
      action: "voice.customvc.delete",
      details: { channelId }
    }).catch(() => {});

    await interaction.update({
      embeds: [new EmbedBuilder().setTitle("Custom VC Deleted").setDescription("Room deleted.").setColor(0x22c55e)],
      components: []
    }).catch(async () => {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VC Deleted").setDescription("Room deleted.").setColor(0x22c55e)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
    });
    return true;
  }

  return false;
}

export async function handleCustomVcSelect(interaction) {
  // No select menus are used for Custom VCs (DM-friendly controls via modals).
  return false;
}

export async function handleCustomVcModal(interaction) {
  if (!interaction.isModalSubmit?.()) return false;
  const parts = parseId(interaction.customId);
  if (!parts) return false;

  if (parts[0] !== "modal") return false;
  const action = parts[1];

  if (action === "create") {
    const guildId = parts[2];
    if (!isSnowflake(guildId) || !interaction.inGuild?.()) return false;

    const voice = await getVoiceState(guildId);
    ensureCustomVcsState(voice);
    const cfg = getCustomVcConfig(voice);

    if (!cfg.enabled) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VCs Disabled").setDescription("An admin must enable this feature first.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }
    if (!cfg.categoryId) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VCs Not Set Up").setDescription("An admin must configure a category first.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      });
      return true;
    }

    const existing = findUserCustomRooms(voice, interaction.user.id);
    if (existing.length >= (cfg.maxRoomsPerUser || 1)) {
      const first = existing[0];
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VC Limit Reached").setDescription(`You already have a Custom VC: <#${first.channelId}>.`).setColor(0xf59e0b)],
        components: makeManageButtonRow({ guildId, channelId: first.channelId, ownerId: interaction.user.id }),
        ...inGuildFlags(interaction)
      });
      return true;
    }

    const name = interaction.fields.getTextInputValue("name");
    const limit = interaction.fields.getTextInputValue("limit");
    const bitrate = interaction.fields.getTextInputValue("bitrate");

    const n = nonce();
    pending.set(n, {
      guildId: String(guildId),
      userId: interaction.user.id,
      name: safeName(name, ""),
      limit: String(limit || "").trim(),
      bitrateKbps: String(bitrate || "").trim(),
      createdAt: Date.now(),
      expiresAt: Date.now() + PENDING_TTL_MS
    });

    const ctx = await resolveGuildCtx(interaction, guildId);
    const promptEmbed = privacyPromptEmbed({ guildName: ctx?.guild?.name || "", requestedName: name });
    const promptComponents = privacyPromptComponents(n, interaction.user.id);

    // DM first (best-effort).
    const dmSent = await interaction.user
      .send({ embeds: [promptEmbed], components: promptComponents })
      .then(() => true)
      .catch(() => false);

    // Always provide an in-server fallback prompt as well (ephemeral).
    const fallback = new EmbedBuilder()
      .setTitle("Choose Privacy")
      .setDescription(
        dmSent
          ? "Check your DMs to finish creating your Custom VC. If you did not receive a DM, use the buttons below."
          : "I could not DM you. Use the buttons below to finish creating your Custom VC."
      )
      .setColor(dmSent ? 0x22c55e : 0xf59e0b);

    await interaction.reply({
      embeds: [fallback, promptEmbed],
      components: promptComponents,
      ...inGuildFlags(interaction)
    });
    return true;
  }

  if (action === "edit") {
    const guildId = parts[2];
    const channelId = parts[3];
    const ownerId = parts[4];
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("Room missing.").setColor(0xf59e0b)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }
    const { guild, voice, cfg, record, channel, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can edit this room.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    const name = interaction.fields.getTextInputValue("name");
    const limitRaw = interaction.fields.getTextInputValue("limit");
    const bitrateRaw = interaction.fields.getTextInputValue("bitrate");

    const nextName = safeName(name, channel.name);
    const nextLimit = limitRaw ? safeInt(limitRaw, { min: 0, max: 99, fallback: channel.userLimit || 0 }) : null;

    const maxBitrateKbps = Number.isFinite(guild.maximumBitrate)
      ? Math.max(8, Math.trunc(guild.maximumBitrate / 1000))
      : 512;
    const nextBitrate = bitrateRaw ? safeInt(bitrateRaw, { min: 8, max: maxBitrateKbps, fallback: null }) : null;

    try {
      if (nextName && nextName !== channel.name) await channel.setName(nextName).catch(() => {});
      if (nextLimit !== null) await channel.setUserLimit(nextLimit).catch(() => {});
      if (nextBitrate !== null) await channel.setBitrate(nextBitrate * 1000).catch(() => {});
    } catch {}

    await auditLog({
      guildId: guild.id,
      userId: interaction.user.id,
      action: "voice.customvc.edit",
      details: { channelId, name: nextName, userLimit: nextLimit, bitrateKbps: nextBitrate }
    }).catch(() => {});

    await interaction.reply({
      embeds: [new EmbedBuilder().setTitle("Custom VC Updated").setDescription(`Updated <#${channel.id}>.`).setColor(0x22c55e)],
      components: makeManageButtonRow({ guildId: guild.id, channelId, ownerId }),
      ...inGuildFlags(interaction)
    }).catch(async () => {
      await renderManage(interaction, { guildId, channelId, ownerId, page: "settings", update: true, note: "Updated." });
    });
    return true;
  }

  if (action === "guests" || action === "banjoin" || action === "banspeak") {
    const guildId = parts[2];
    const channelId = parts[3];
    const ownerId = parts[4];
    if (!isSnowflake(guildId) || !isSnowflake(channelId) || !isSnowflake(ownerId)) return false;

    const res = await resolveRoomAndConfig(interaction, guildId, channelId);
    if (!res.ok) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Custom VC").setDescription("Room missing.").setColor(0xf59e0b)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }
    const { guild, voice, cfg, record, channel, ctx } = res;
    if (!(await canManageRoom(interaction, record, cfg, ctx))) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Permission Required").setDescription("Only the host (or admins) can manage this room.").setColor(0xef4444)],
        ...inGuildFlags(interaction)
      }).catch(() => {});
      return true;
    }

    const idsRaw = interaction.fields.getTextInputValue("ids");
    const ids = extractUserIds(idsRaw).slice(0, 100);

    const valid = [];
    const immune = [];
    for (const uid of ids) {
      if (!isSnowflake(uid)) continue;
      if (uid === record.ownerId) continue;
      const m = await guild.members.fetch(uid).catch(() => null);
      if (!m) continue;
      const isImmune = hasManageGuildPerms(m.permissions) || hasAnyRole(m, cfg.modRoleIds);
      if (isImmune && (action === "banjoin" || action === "banspeak")) {
        immune.push(uid);
        continue;
      }
      valid.push(uid);
    }

    let patch = null;
    let note = "";
    if (action === "guests") {
      patch = { guestIds: valid };
      note = `Guestlist set (${valid.length}).`;
    } else if (action === "banjoin") {
      patch = { denyJoinIds: valid };
      note = `Deny join set (${valid.length}).`;
    } else {
      patch = { denySpeakIds: valid };
      note = `Deny speak set (${valid.length}).`;
    }

    // Remove guest entries that are also join-denied (defense-in-depth).
    if (patch.denyJoinIds) {
      const deny = new Set(patch.denyJoinIds);
      patch.guestIds = (record.guestIds || []).filter(uid => !deny.has(uid));
    }

    const patched = await patchCustomRoom(guild.id, channelId, patch, voice);
    if (patched.ok) {
      await applyOverwrites(guild, channel, patched.record, cfg);
      await auditLog({
        guildId: guild.id,
        userId: interaction.user.id,
        action: `voice.customvc.${action}`,
        details: { channelId, count: valid.length, immune: immune.length }
      }).catch(() => {});
    }

    const immuneLine = immune.length ? `\nSkipped immune users (admins/mods): ${immune.length}` : "";
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Custom VC Updated")
          .setDescription(`${note}${immuneLine}`)
          .setColor(patched.ok ? 0x22c55e : 0xef4444)
      ],
      components: makeManageButtonRow({ guildId: guild.id, channelId, ownerId }),
      ...inGuildFlags(interaction)
    }).catch(async () => {
      await renderManage(interaction, { guildId, channelId, ownerId, page: "main", update: true, note });
    });

    return true;
  }

  return false;
}

export async function loadAndSaveCustomVcsConfig(guildId, patch = {}) {
  const voice = await getVoiceState(guildId);
  ensureCustomVcsState(voice);
  const cfg = getCustomVcConfig(voice);

  if (patch.enabled !== undefined) cfg.enabled = Boolean(patch.enabled);
  if (patch.categoryId !== undefined) cfg.categoryId = patch.categoryId ? String(patch.categoryId) : null;
  if (patch.panelChannelId !== undefined) cfg.panelChannelId = patch.panelChannelId ? String(patch.panelChannelId) : null;
  if (patch.panelMessageId !== undefined) cfg.panelMessageId = patch.panelMessageId ? String(patch.panelMessageId) : null;

  if (patch.modRoleId !== undefined) {
    const roleId = patch.modRoleId ? String(patch.modRoleId) : "";
    if (isSnowflake(roleId) && !cfg.modRoleIds.includes(roleId)) cfg.modRoleIds.push(roleId);
  }
  if (patch.clearModRoles) cfg.modRoleIds = [];

  if (patch.maxRoomsPerUser !== undefined) {
    cfg.maxRoomsPerUser = safeInt(patch.maxRoomsPerUser, { min: 1, max: 5, fallback: cfg.maxRoomsPerUser || 1 });
  }
  if (patch.defaultUserLimit !== undefined) {
    cfg.defaultUserLimit = safeInt(patch.defaultUserLimit, { min: 0, max: 99, fallback: cfg.defaultUserLimit || 0 });
  }
  if (patch.defaultBitrateKbps !== undefined) {
    const v = patch.defaultBitrateKbps;
    cfg.defaultBitrateKbps = v === null ? null : safeInt(v, { min: 8, max: 512, fallback: cfg.defaultBitrateKbps });
  }

  voice.customVcs = cfg;
  await saveVoiceState(guildId, voice);
  return { ok: true, cfg, voice };
}
