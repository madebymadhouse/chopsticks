// src/tools/voice/commands.js
// UI-ONLY COMMAND DEFINITION

import {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

import * as VoiceDomain from "./domain.js";
import { getVoiceState } from "./schema.js";
import { auditLog } from "../../utils/audit.js";

const adminSubs = new Set([
  "add",
  "setup",
  "remove",
  "enable",
  "disable",
  "update",
  "status",
  "reset"
]);

const roomSubs = new Set([
  "room_status",
  "room_rename",
  "room_limit",
  "room_lock",
  "room_unlock"
]);

function hasAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
}

function buildEmbed(title, description) {
  return new EmbedBuilder().setTitle(title).setDescription(description ?? "");
}

function formatLobbyLine(lobby, channelLabel, tempCount) {
  const enabled = lobby.enabled ? "enabled" : "disabled";
  const limit = Number.isFinite(lobby.userLimit) ? lobby.userLimit : 0;
  const bitrate = Number.isFinite(lobby.bitrateKbps) ? `${lobby.bitrateKbps}kbps` : "auto";
  const maxChannels = Number.isFinite(lobby.maxChannels) ? lobby.maxChannels : "∞";
  const categoryLabel = lobby.categoryId ? `<#${lobby.categoryId}>` : "n/a";
  return `${channelLabel} · ${enabled} · temp ${tempCount} · limit ${limit} · bitrate ${bitrate} · max ${maxChannels} · category ${categoryLabel}`;
}

async function getRoomContext(interaction) {
  const member = interaction.member;
  const channel = member?.voice?.channel ?? null;
  if (!channel) return { ok: false, error: "not-in-voice" };

  const voice = await getVoiceState(interaction.guildId);
  if (!voice) return { ok: false, error: "no-voice-state" };
  voice.tempChannels ??= {};

  const temp = voice.tempChannels[channel.id];
  if (!temp) return { ok: false, error: "not-temp" };

  const isOwner = temp.ownerId === interaction.user.id;
  const isAdmin = hasAdmin(interaction);
  if (!isOwner && !isAdmin) return { ok: false, error: "not-owner" };

  return { ok: true, channel, temp, isOwner, isAdmin };
}

function roomErrorMessage(code) {
  if (code === "not-in-voice") return "Join a voice channel first.";
  if (code === "no-voice-state") return "Voice settings are not initialized yet.";
  if (code === "not-temp") return "This channel is not managed by VoiceMaster.";
  if (code === "not-owner") return "Only the room owner (or admins) can change this room.";
  return "Unable to complete that action.";
}

export const data = new SlashCommandBuilder()
  .setName("voice")
  .setDescription("VoiceMaster setup and room controls")

  .addSubcommand(sub =>
    sub
      .setName("add")
      .setDescription("Register a lobby channel")
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Voice channel users join")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
      .addChannelOption(o =>
        o
          .setName("category")
          .setDescription("Category for temp channels")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
      .addStringOption(o =>
        o
          .setName("template")
          .setDescription("Channel name template (use {user})")
      )
      .addIntegerOption(o =>
        o
          .setName("user_limit")
          .setDescription("User limit for temp channels (0 = unlimited)")
          .setMinValue(0)
          .setMaxValue(99)
      )
      .addIntegerOption(o =>
        o
          .setName("bitrate_kbps")
          .setDescription("Bitrate for temp channels (kbps)")
          .setMinValue(8)
          .setMaxValue(512)
      )
      .addIntegerOption(o =>
        o
          .setName("max_channels")
          .setDescription("Max temp channels per lobby")
          .setMinValue(0)
          .setMaxValue(99)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("setup")
      .setDescription("Create a lobby + category and register VoiceMaster")
      .addStringOption(o =>
        o
          .setName("lobby_name")
          .setDescription("Lobby voice channel name")
      )
      .addStringOption(o =>
        o
          .setName("category_name")
          .setDescription("Category for temp channels")
      )
      .addStringOption(o =>
        o
          .setName("template")
          .setDescription("Channel name template (use {user})")
      )
      .addIntegerOption(o =>
        o
          .setName("user_limit")
          .setDescription("User limit for temp channels (0 = unlimited)")
          .setMinValue(0)
          .setMaxValue(99)
      )
      .addIntegerOption(o =>
        o
          .setName("bitrate_kbps")
          .setDescription("Bitrate for temp channels (kbps)")
          .setMinValue(8)
          .setMaxValue(512)
      )
      .addIntegerOption(o =>
        o
          .setName("max_channels")
          .setDescription("Max temp channels per lobby")
          .setMinValue(0)
          .setMaxValue(99)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("remove")
      .setDescription("Remove a lobby channel")
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Lobby channel to remove")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("enable")
      .setDescription("Enable a lobby channel")
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Lobby channel to enable")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("disable")
      .setDescription("Disable a lobby channel")
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Lobby channel to disable")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("update")
      .setDescription("Update lobby settings")
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Lobby channel to update")
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
      .addStringOption(o =>
        o
          .setName("template")
          .setDescription("Channel name template (use {user})")
      )
      .addIntegerOption(o =>
        o
          .setName("user_limit")
          .setDescription("User limit for temp channels (0 = unlimited)")
          .setMinValue(0)
          .setMaxValue(99)
      )
      .addIntegerOption(o =>
        o
          .setName("bitrate_kbps")
          .setDescription("Bitrate for temp channels (kbps)")
          .setMinValue(8)
          .setMaxValue(512)
      )
      .addIntegerOption(o =>
        o
          .setName("max_channels")
          .setDescription("Max temp channels per lobby")
          .setMinValue(0)
          .setMaxValue(99)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("status")
      .setDescription("Show current voice configuration")
  )

  .addSubcommand(sub =>
    sub
      .setName("reset")
      .setDescription("Reset all voice configuration")
  )

  .addSubcommand(sub =>
    sub
      .setName("room_status")
      .setDescription("Show your current room settings")
  )

  .addSubcommand(sub =>
    sub
      .setName("room_rename")
      .setDescription("Rename your current room")
      .addStringOption(o =>
        o
          .setName("name")
          .setDescription("New channel name")
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("room_limit")
      .setDescription("Set user limit for your room")
      .addIntegerOption(o =>
        o
          .setName("limit")
          .setDescription("User limit (0 = unlimited)")
          .setMinValue(0)
          .setMaxValue(99)
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName("room_lock")
      .setDescription("Lock your room (deny Connect for @everyone)")
  )

  .addSubcommand(sub =>
    sub
      .setName("room_unlock")
      .setDescription("Unlock your room")
  );

export async function execute(interaction) {
  if (!interaction.inGuild()) return;

  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();

  if (adminSubs.has(sub) && !hasAdmin(interaction)) {
    await interaction.reply({
      content: "Manage Server permission required for this command.",
      ephemeral: true
    });
    return;
  }

  if (sub === "add") {
    const category = interaction.options.getChannel("category");
    const me = interaction.guild?.members?.me ?? (await interaction.guild?.members?.fetchMe().catch(() => null));
    if (me) {
      const perms = category.permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.ManageChannels) || !perms?.has(PermissionFlagsBits.MoveMembers)) {
        await interaction.reply({
          content: "Missing permissions in that category (Manage Channels + Move Members required).",
          ephemeral: true
        });
        return;
      }
    }
    const lobbyChannel = interaction.options.getChannel("channel");
    const res = await VoiceDomain.addLobby(
      guildId,
      lobbyChannel.id,
      category.id,
      interaction.options.getString("template") ?? "{user}'s room",
      {
        userLimit: interaction.options.getInteger("user_limit"),
        bitrateKbps: interaction.options.getInteger("bitrate_kbps"),
        maxChannels: interaction.options.getInteger("max_channels")
      }
    );
    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: "voice.lobby.add",
      details: res
    });
    const status = res.action === "exists" ? "Lobby already registered." : "Lobby added.";
    const embed = buildEmbed(
      "Voice lobby",
      `${status}\nLobby: <#${lobbyChannel.id}>\nCategory: <#${category.id}>`
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "setup") {
    const guild = interaction.guild;
    const me = guild?.members?.me ?? (await guild?.members?.fetchMe().catch(() => null));
    if (me) {
      const perms = me.permissions;
      if (!perms?.has(PermissionFlagsBits.ManageChannels) || !perms?.has(PermissionFlagsBits.MoveMembers)) {
        await interaction.reply({
          content: "Missing permissions (Manage Channels + Move Members required).",
          ephemeral: true
        });
        return;
      }
    }

    const lobbyName = interaction.options.getString("lobby_name") ?? "Join to Create";
    const categoryName = interaction.options.getString("category_name") ?? "Voice Rooms";
    const template = interaction.options.getString("template") ?? "{user}'s room";

    let category = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildCategory && ch.name === categoryName
    ) ?? null;

    if (!category) {
      category = await guild.channels.create({
        name: categoryName,
        type: ChannelType.GuildCategory
      });
    }

    let lobby = guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildVoice && ch.name === lobbyName && ch.parentId === category.id
    ) ?? null;

    if (!lobby) {
      lobby = await guild.channels.create({
        name: lobbyName,
        type: ChannelType.GuildVoice,
        parent: category.id
      });
    }

    const res = await VoiceDomain.addLobby(
      guildId,
      lobby.id,
      category.id,
      template,
      {
        userLimit: interaction.options.getInteger("user_limit"),
        bitrateKbps: interaction.options.getInteger("bitrate_kbps"),
        maxChannels: interaction.options.getInteger("max_channels")
      }
    );

    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: "voice.lobby.setup",
      details: res
    });

    const embed = buildEmbed(
      "Voice setup",
      `Lobby: <#${lobby.id}>\nCategory: <#${category.id}>\nTemplate: ${template}`
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "remove") {
    const lobbyChannel = interaction.options.getChannel("channel");
    const res = await VoiceDomain.removeLobby(guildId, lobbyChannel.id);
    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: "voice.lobby.remove",
      details: res
    });
    const embed = buildEmbed("Voice lobby removed", `Lobby: <#${lobbyChannel.id}>`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "enable" || sub === "disable") {
    const lobbyChannel = interaction.options.getChannel("channel");
    const res = await VoiceDomain.setLobbyEnabled(
      guildId,
      lobbyChannel.id,
      sub === "enable"
    );
    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: `voice.lobby.${sub}`,
      details: res
    });
    const embed = buildEmbed(
      "Voice lobby updated",
      `Lobby: <#${lobbyChannel.id}>\nState: ${sub === "enable" ? "enabled" : "disabled"}`
    );
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "update") {
    const lobbyChannel = interaction.options.getChannel("channel");
    const maxChannelsRaw = interaction.options.getInteger("max_channels");
    const maxChannels =
      maxChannelsRaw === null ? undefined : (maxChannelsRaw === 0 ? null : maxChannelsRaw);
    const res = await VoiceDomain.updateLobby(
      guildId,
      lobbyChannel.id,
      {
        template: interaction.options.getString("template") ?? undefined,
        userLimit: interaction.options.getInteger("user_limit"),
        bitrateKbps: interaction.options.getInteger("bitrate_kbps"),
        maxChannels
      }
    );
    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: "voice.lobby.update",
      details: res
    });
    if (!res.ok) {
      await interaction.reply({
        content: res.error === "invalid-max-channels"
          ? "max_channels must be 1 or higher."
          : "Unable to update lobby.",
        ephemeral: true
      });
      return;
    }
    const embed = buildEmbed("Voice lobby updated", `Lobby: <#${lobbyChannel.id}>`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "status") {
    const res = await VoiceDomain.getStatus(guildId);
    const entries = Object.entries(res.lobbies ?? {});
    if (!entries.length) {
      const embed = buildEmbed(
        "Voice status",
        "No lobbies configured. Use /voice add to register a lobby."
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }
    const tempChannels = Object.values(res.tempChannels ?? {});
    const lines = entries.map(([channelId, lobby]) => {
      const channelLabel = `<#${channelId}>`;
      const tempCount = tempChannels.filter(temp => temp.lobbyId === channelId).length;
      return formatLobbyLine(lobby, channelLabel, tempCount);
    });
    const maxLines = 15;
    const visible = lines.slice(0, maxLines);
    const remaining = lines.length > maxLines ? `\n...and ${lines.length - maxLines} more` : "";
    const embed = buildEmbed("Voice status", visible.join("\n") + remaining);
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (sub === "reset") {
    const res = await VoiceDomain.resetVoice(guildId);
    await auditLog({
      guildId,
      userId: interaction.user.id,
      action: "voice.lobby.reset",
      details: res
    });
    const embed = buildEmbed("Voice reset", "All lobbies and temp channel records cleared.");
    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (roomSubs.has(sub)) {
    const ctx = await getRoomContext(interaction);
    if (!ctx.ok) {
      await interaction.reply({ content: roomErrorMessage(ctx.error), ephemeral: true });
      return;
    }
    const { channel } = ctx;
    const everyoneId = interaction.guild?.roles?.everyone?.id;

    if (sub === "room_status") {
      const lobbyId = ctx.temp.lobbyId ? `<#${ctx.temp.lobbyId}>` : "n/a";
      const limit = Number.isFinite(channel.userLimit) ? channel.userLimit : 0;
      const overwrite = everyoneId ? channel.permissionOverwrites.cache.get(everyoneId) : null;
      const locked = Boolean(overwrite?.deny?.has(PermissionFlagsBits.Connect));
      const embed = buildEmbed(
        "Room status",
        `Lobby: ${lobbyId}\nOwner: <@${ctx.temp.ownerId}>\nLimit: ${limit}\nLocked: ${locked ? "yes" : "no"}`
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "room_rename") {
      const name = interaction.options.getString("name", true).slice(0, 90);
      await channel.setName(name);
      const embed = buildEmbed("Room updated", `Name set to: ${name}`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "room_limit") {
      const limit = interaction.options.getInteger("limit", true);
      await channel.setUserLimit(limit);
      const embed = buildEmbed("Room updated", `User limit set to ${limit}.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "room_lock") {
      if (!everyoneId) {
        await interaction.reply({ content: "Unable to resolve @everyone role.", ephemeral: true });
        return;
      }
      await channel.permissionOverwrites.edit(everyoneId, { Connect: false });
      const embed = buildEmbed("Room locked", "Connect is denied for @everyone.");
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === "room_unlock") {
      if (!everyoneId) {
        await interaction.reply({ content: "Unable to resolve @everyone role.", ephemeral: true });
        return;
      }
      if (channel.permissionOverwrites.cache.has(everyoneId)) {
        await channel.permissionOverwrites.delete(everyoneId);
      }
      const embed = buildEmbed("Room unlocked", "Connect permissions restored to category defaults.");
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
}
