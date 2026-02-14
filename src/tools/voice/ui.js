import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} from "discord.js";

import * as VoiceDomain from "./domain.js";
import { getVoiceState } from "./schema.js";
import { deliverVoiceRoomDashboard, resolvePanelDelivery } from "./panel.js";
import { ownerPermissionOverwrite } from "./ownerPerms.js";
import { auditLog } from "../../utils/audit.js";

const UI_PREFIX = "voiceui";
const MODE_LABELS = {
  temp: "Room voice chat",
  dm: "Direct message",
  channel: "Configured text channel",
  here: "Where command was run",
  both: "DM + room/channel",
  off: "Off"
};

function hasAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function buildEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description ?? "");
}

function buildErrorEmbed(message) {
  return buildEmbed("Voice error", message);
}

function getLockedState(channel, everyoneRoleId) {
  const overwrite = everyoneRoleId ? channel.permissionOverwrites.cache.get(everyoneRoleId) : null;
  return Boolean(overwrite?.deny?.has(PermissionFlagsBits.Connect));
}

function buildModeOptions(currentMode, { includeHere }) {
  const modes = includeHere
    ? ["temp", "dm", "channel", "here", "both", "off"]
    : ["temp", "dm", "channel", "both", "off"];
  return modes.map(mode => ({
    label: MODE_LABELS[mode] ?? mode,
    value: mode,
    description: `Deliver panel via ${mode}`,
    default: currentMode === mode
  }));
}

function makeCustomId(kind, userId, channelId) {
  return `${UI_PREFIX}:${kind}:${userId}:${channelId}`;
}

function parseCustomId(customId) {
  const parts = String(customId || "").split(":");
  if (parts.length < 4 || parts[0] !== UI_PREFIX) return null;
  return {
    kind: parts[1],
    userId: parts[2],
    channelId: parts[3]
  };
}

function inferPanelChannelIdFromInteraction(interaction, mode) {
  const needsChannel = mode === "channel" || mode === "both";
  if (!needsChannel) return undefined;
  if (interaction.channel?.isTextBased?.() && !interaction.channel?.isDMBased?.()) {
    return interaction.channelId;
  }
  return undefined;
}

async function resolveContext(interaction, channelId, { requireMembership = true, requireControl = false } = {}) {
  if (!interaction.inGuild?.()) return { ok: false, error: "guild-only" };

  const guild = interaction.guild;
  const voice = await getVoiceState(interaction.guildId);
  if (!voice) return { ok: false, error: "no-voice-state" };

  voice.tempChannels ??= {};
  voice.lobbies ??= {};

  const temp = voice.tempChannels[channelId];
  if (!temp) return { ok: false, error: "not-temp" };

  const roomChannel = guild.channels.cache.get(channelId)
    ?? (await guild.channels.fetch(channelId).catch(() => null));
  if (!roomChannel) return { ok: false, error: "room-missing" };

  const inRoom = roomChannel.members.has(interaction.user.id);
  const isAdmin = hasAdmin(interaction);
  const isOwner = temp.ownerId === interaction.user.id;

  if (requireMembership && !inRoom && !isAdmin) {
    return { ok: false, error: "not-in-room" };
  }

  if (requireControl && !isOwner && !isAdmin) {
    return { ok: false, error: "not-owner" };
  }

  const lobby = voice.lobbies?.[temp.lobbyId] ?? null;
  return {
    ok: true,
    guild,
    voice,
    temp,
    roomChannel,
    lobby,
    isOwner,
    isAdmin,
    inRoom
  };
}

function contextErrorMessage(code) {
  if (code === "guild-only") return "This control panel only works in servers.";
  if (code === "no-voice-state") return "Voice state is not initialized yet.";
  if (code === "not-temp") return "This room is no longer managed by VoiceMaster.";
  if (code === "room-missing") return "The room no longer exists.";
  if (code === "not-owner") return "Only the room owner (or admins) can do that.";
  if (code === "not-in-room") return "Join this room to use its control buttons.";
  return "Unable to use VoiceMaster controls right now.";
}

function buildConsoleEmbed(ctx, panelForUser, { notice = null } = {}) {
  const everyoneRoleId = ctx.guild.roles.everyone?.id;
  const locked = getLockedState(ctx.roomChannel, everyoneRoleId);
  const members = ctx.roomChannel.members.filter(m => !m.user?.bot).size;
  const guildDefault = ctx.voice.panel?.guildDefault ?? {};

  const embed = new EmbedBuilder()
    .setTitle("VoiceMaster Console")
    .setDescription(`Room: <#${ctx.roomChannel.id}>`)
    .addFields(
      { name: "Owner", value: `<@${ctx.temp.ownerId}>`, inline: true },
      { name: "Members", value: String(members), inline: true },
      { name: "Locked", value: locked ? "yes" : "no", inline: true },
      {
        name: "Your Panel Default",
        value: `${panelForUser.mode}${panelForUser.channelId ? ` in <#${panelForUser.channelId}>` : ""} (auto-send: ${panelForUser.autoSendOnCreate ? "on" : "off"})`
      },
      {
        name: "Guild Panel Default",
        value: `${String(guildDefault.mode || "temp")}${guildDefault.channelId ? ` in <#${guildDefault.channelId}>` : ""} (auto-send: ${guildDefault.autoSendOnCreate !== false ? "on" : "off"})`
      }
    );

  if (notice) {
    embed.setFooter({ text: notice.slice(0, 240) });
  }

  return embed;
}

function buildConsoleComponents(ctx, targetUserId, panelForUser) {
  const everyoneRoleId = ctx.guild.roles.everyone?.id;
  const locked = getLockedState(ctx.roomChannel, everyoneRoleId);
  const canControl = ctx.isOwner || ctx.isAdmin;
  const ownerPresent = ctx.roomChannel.members.has(ctx.temp.ownerId);
  const canClaim = !ctx.isOwner && ctx.inRoom && (!ownerPresent || ctx.isAdmin);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(makeCustomId("refresh", targetUserId, ctx.roomChannel.id))
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(makeCustomId("status", targetUserId, ctx.roomChannel.id))
      .setLabel("Status")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(makeCustomId("panel_here", targetUserId, ctx.roomChannel.id))
      .setLabel("Panel Here")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(makeCustomId("panel_dm", targetUserId, ctx.roomChannel.id))
      .setLabel("Panel DM")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(makeCustomId("claim", targetUserId, ctx.roomChannel.id))
      .setLabel("Claim")
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canClaim)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(makeCustomId("lock", targetUserId, ctx.roomChannel.id))
      .setLabel(locked ? "Already Locked" : "Lock Room")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(locked || !canControl || !ctx.inRoom),
    new ButtonBuilder()
      .setCustomId(makeCustomId("unlock", targetUserId, ctx.roomChannel.id))
      .setLabel(locked ? "Unlock Room" : "Already Unlocked")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!locked || !canControl || !ctx.inRoom)
  );

  const userModeSelect = new StringSelectMenuBuilder()
    .setCustomId(makeCustomId("user_mode", targetUserId, ctx.roomChannel.id))
    .setPlaceholder("Set your panel delivery default")
    .addOptions(buildModeOptions(panelForUser.mode, { includeHere: true }));

  const rows = [row1, row2, new ActionRowBuilder().addComponents(userModeSelect)];

  if (ctx.isAdmin) {
    const guildMode = String(ctx.voice.panel?.guildDefault?.mode || "temp");
    const guildModeSelect = new StringSelectMenuBuilder()
      .setCustomId(makeCustomId("guild_mode", targetUserId, ctx.roomChannel.id))
      .setPlaceholder("Set guild panel delivery default")
      .addOptions(buildModeOptions(guildMode, { includeHere: false }));
    rows.push(new ActionRowBuilder().addComponents(guildModeSelect));
  }

  return rows;
}

async function updateConsole(interaction, sourceUserId, channelId, notice = null) {
  const ctx = await resolveContext(interaction, channelId, { requireMembership: false, requireControl: false });
  if (!ctx.ok) {
    await interaction.update({
      embeds: [buildErrorEmbed(contextErrorMessage(ctx.error))],
      components: []
    });
    return true;
  }

  const panelForUser = resolvePanelDelivery(ctx.voice, sourceUserId);
  await interaction.update({
    embeds: [buildConsoleEmbed(ctx, panelForUser, { notice })],
    components: buildConsoleComponents(ctx, sourceUserId, panelForUser)
  });
  return true;
}

function panelDeliveryMessage(sent) {
  if (!sent?.ok) {
    if (sent?.reason === "off") return "Delivery is off. Change mode in the dropdown first.";
    if (sent?.reason === "disabled") return "Auto-send is disabled for creation events.";
    if (sent?.reason === "missing-target") return "No writable target channel was found.";
    return "Panel delivery failed.";
  }
  return `Panel delivered (DM: ${sent.dmSent ? "yes" : "no"}, channel: ${sent.channelSent ? "yes" : "no"}).`;
}

async function handleClaim(interaction, ctx) {
  if (ctx.isOwner) return { ok: true, notice: "You already own this room." };

  const ownerPresent = ctx.roomChannel.members.has(ctx.temp.ownerId);
  if (ownerPresent && !ctx.isAdmin) {
    return { ok: false, error: "Current owner is still in the room." };
  }

  const transfer = await VoiceDomain.transferTempOwnership(interaction.guildId, ctx.roomChannel.id, interaction.user.id);
  if (!transfer.ok) return { ok: false, error: "Unable to claim ownership right now." };

  const ownerOverwrite = ownerPermissionOverwrite(ctx.lobby?.ownerPermissions);
  try {
    await ctx.roomChannel.permissionOverwrites.edit(interaction.user.id, ownerOverwrite);
  } catch {
    return { ok: false, error: "Ownership was transferred in state, but Discord permission update failed." };
  }

  if (ctx.roomChannel.permissionOverwrites.cache.has(ctx.temp.ownerId)) {
    await ctx.roomChannel.permissionOverwrites.delete(ctx.temp.ownerId).catch(err => {
      console.warn(`[voice-ui] failed to clear previous owner overwrite: ${err?.message ?? err}`);
    });
  }

  await auditLog({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    action: "voice.room.claim.button",
    details: {
      channelId: ctx.roomChannel.id,
      previousOwnerId: ctx.temp.ownerId,
      ownerId: interaction.user.id
    }
  });

  return { ok: true, notice: "Room ownership claimed." };
}

async function handleLockToggle(interaction, ctx, shouldLock) {
  const everyoneRoleId = interaction.guild.roles.everyone?.id;
  if (!everyoneRoleId) return { ok: false, error: "Unable to resolve @everyone role." };

  try {
    if (shouldLock) {
      await ctx.roomChannel.permissionOverwrites.edit(everyoneRoleId, { Connect: false });
      return { ok: true, notice: "Room locked." };
    }

    if (ctx.roomChannel.permissionOverwrites.cache.has(everyoneRoleId)) {
      await ctx.roomChannel.permissionOverwrites.delete(everyoneRoleId);
    }
    return { ok: true, notice: "Room unlocked." };
  } catch {
    return { ok: false, error: "Failed to update room lock state. Check bot permissions." };
  }
}

export async function showVoiceConsole(interaction) {
  const channelId = interaction.member?.voice?.channelId;
  if (!channelId) {
    await interaction.reply({ embeds: [buildErrorEmbed("Join a VoiceMaster room first.")], ephemeral: true });
    return;
  }

  const ctx = await resolveContext(interaction, channelId, { requireMembership: true, requireControl: false });
  if (!ctx.ok) {
    await interaction.reply({ embeds: [buildErrorEmbed(contextErrorMessage(ctx.error))], ephemeral: true });
    return;
  }

  const panelForUser = resolvePanelDelivery(ctx.voice, interaction.user.id);
  await interaction.reply({
    embeds: [buildConsoleEmbed(ctx, panelForUser)],
    components: buildConsoleComponents(ctx, interaction.user.id, panelForUser),
    ephemeral: true
  });
}

export async function handleVoiceUIButton(interaction) {
  if (!interaction.isButton?.()) return false;

  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return false;

  if (interaction.user.id !== parsed.userId) {
    await interaction.reply({ embeds: [buildErrorEmbed("This panel belongs to another user.")], ephemeral: true });
    return true;
  }

  if (parsed.kind === "refresh" || parsed.kind === "status") {
    const label = parsed.kind === "refresh" ? "Refreshed." : "Status refreshed.";
    return updateConsole(interaction, parsed.userId, parsed.channelId, label);
  }

  const requireControl = new Set(["lock", "unlock"]).has(parsed.kind);
  const ctx = await resolveContext(interaction, parsed.channelId, {
    requireMembership: true,
    requireControl
  });
  if (!ctx.ok) {
    await interaction.reply({ embeds: [buildErrorEmbed(contextErrorMessage(ctx.error))], ephemeral: true });
    return true;
  }

  if (parsed.kind === "panel_here" || parsed.kind === "panel_dm") {
    const sent = await deliverVoiceRoomDashboard({
      guild: interaction.guild,
      member: interaction.member,
      roomChannel: ctx.roomChannel,
      tempRecord: ctx.temp,
      lobby: ctx.lobby,
      voice: ctx.voice,
      modeOverride: parsed.kind === "panel_here" ? "here" : "dm",
      interactionChannel: interaction.channel,
      reason: "manual"
    });
    return updateConsole(interaction, parsed.userId, parsed.channelId, panelDeliveryMessage(sent));
  }

  if (parsed.kind === "claim") {
    const result = await handleClaim(interaction, ctx);
    if (!result.ok) {
      await interaction.reply({ embeds: [buildErrorEmbed(result.error)], ephemeral: true });
      return true;
    }
    return updateConsole(interaction, parsed.userId, parsed.channelId, result.notice);
  }

  if (parsed.kind === "lock" || parsed.kind === "unlock") {
    const result = await handleLockToggle(interaction, ctx, parsed.kind === "lock");
    if (!result.ok) {
      await interaction.reply({ embeds: [buildErrorEmbed(result.error)], ephemeral: true });
      return true;
    }
    return updateConsole(interaction, parsed.userId, parsed.channelId, result.notice);
  }

  await interaction.reply({ embeds: [buildErrorEmbed("Unsupported VoiceMaster UI action.")], ephemeral: true });
  return true;
}

export async function handleVoiceUISelect(interaction) {
  if (!interaction.isStringSelectMenu?.()) return false;

  const parsed = parseCustomId(interaction.customId);
  if (!parsed) return false;

  if (interaction.user.id !== parsed.userId) {
    await interaction.reply({ embeds: [buildErrorEmbed("This panel belongs to another user.")], ephemeral: true });
    return true;
  }

  const mode = interaction.values?.[0];
  if (!mode) {
    await interaction.reply({ embeds: [buildErrorEmbed("Select a delivery mode first.")], ephemeral: true });
    return true;
  }

  if (parsed.kind === "user_mode") {
    const channelId = inferPanelChannelIdFromInteraction(interaction, mode);
    if ((mode === "channel" || mode === "both") && !channelId) {
      await interaction.reply({ embeds: [buildErrorEmbed("Choose a text channel context for channel-based delivery.")], ephemeral: true });
      return true;
    }

    const res = await VoiceDomain.setPanelUserDefault(interaction.guildId, interaction.user.id, {
      mode,
      channelId
    });
    if (!res.ok) {
      await interaction.reply({ embeds: [buildErrorEmbed("Failed to update your panel default.")], ephemeral: true });
      return true;
    }

    await auditLog({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      action: "voice.panel.user-default.select",
      details: res.userDefault
    });

    return updateConsole(interaction, parsed.userId, parsed.channelId, `Your default mode is now: ${mode}.`);
  }

  if (parsed.kind === "guild_mode") {
    if (!hasAdmin(interaction)) {
      await interaction.reply({ embeds: [buildErrorEmbed("Manage Server permission required for guild defaults.")], ephemeral: true });
      return true;
    }

    const channelId = inferPanelChannelIdFromInteraction(interaction, mode);
    if ((mode === "channel" || mode === "both") && !channelId) {
      await interaction.reply({ embeds: [buildErrorEmbed("Choose a text channel context for channel-based delivery.")], ephemeral: true });
      return true;
    }

    const res = await VoiceDomain.setPanelGuildDefault(interaction.guildId, {
      mode,
      channelId
    });
    if (!res.ok) {
      await interaction.reply({ embeds: [buildErrorEmbed("Failed to update guild panel default.")], ephemeral: true });
      return true;
    }

    await auditLog({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      action: "voice.panel.guild-default.select",
      details: res.panel?.guildDefault
    });

    return updateConsole(interaction, parsed.userId, parsed.channelId, `Guild default mode is now: ${mode}.`);
  }

  await interaction.reply({ embeds: [buildErrorEmbed("Unsupported VoiceMaster UI selection.")], ephemeral: true });
  return true;
}
