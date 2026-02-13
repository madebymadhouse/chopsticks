// events/voiceStateUpdate.js
// EXECUTION-ONLY EVENT HANDLER
// No direct domain mutation. No persistence.

import { ChannelType, PermissionsBitField } from "discord.js";
import { getVoiceState } from "../tools/voice/schema.js";
import {
  registerTempChannel,
  removeTempChannel,
  findUserTempChannel,
  findAllUserTempChannels,
  acquireCreationLock,
  releaseCreationLock,
  canCreateTempChannel,
  markTempChannelCreated
} from "../tools/voice/state.js";

export default {
  name: "voiceStateUpdate",

  async execute(oldState, newState) {
    const debug = process.env.VOICE_DEBUG === "true";
    const log = (...args) => debug && console.log("[voiceStateUpdate]", ...args);
    const guild = newState.guild ?? oldState.guild;
    if (!guild) return;

    const member = newState.member ?? oldState.member;
    if (!member) return;
    if (member.user?.bot) return;

    const oldChannel = oldState.channel ?? null;
    const newChannel = newState.channel ?? null;

    if (oldChannel?.id === newChannel?.id) return;
    log(
      "state",
      { old: oldChannel?.id ?? null, next: newChannel?.id ?? null, user: member.id }
    );

    const voice = await getVoiceState(guild.id);
    if (!voice) return;

    voice.tempChannels ??= {};
    voice.lobbies ??= {};

    /* ---------- LEAVE TEMP ---------- */

    if (oldChannel && voice.tempChannels[oldChannel.id]) {
      const channelId = oldChannel.id;
      const cleanup = async () => {
        const channel =
          guild.channels.cache.get(channelId) ??
          (await guild.channels.fetch(channelId).catch(() => null));
        if (!channel) {
          await removeTempChannel(guild.id, channelId, voice);
          log("temp channel missing, cleaned", { channelId });
          return;
        }
        const humans = Array.from(channel.members.values()).filter(m => !m.user?.bot).length;
        if (humans > 0) {
          log("temp channel not empty", { channelId, humans });
          return;
        }
        await removeTempChannel(guild.id, channelId, voice);
        await channel.delete().catch(() => {});
        log("temp channel deleted", { channelId });
      };

      setTimeout(() => {
        cleanup().catch(err => log("cleanup failed", { channelId, error: err?.message }));
      }, 500);
    }

    /* ---------- JOIN LOBBY ---------- */

    if (!newChannel) return;

    const lobby = voice.lobbies[newChannel.id];
    if (!lobby || lobby.enabled !== true) {
      log("no lobby or disabled", { channelId: newChannel.id });
      
      // User joined a non-lobby channel - cleanup any orphaned temp channels they own
      const orphanedTempChannels = await findAllUserTempChannels(guild.id, member.id, voice);
      for (const tempId of orphanedTempChannels) {
        const temp = guild.channels.cache.get(tempId) ?? 
                     await guild.channels.fetch(tempId).catch(() => null);
        
        // Only cleanup if channel exists, user is NOT in it, and it's empty
        if (temp && member.voice.channelId !== tempId) {
          const humans = Array.from(temp.members.values()).filter(m => !m.user?.bot).length;
          if (humans === 0) {
            await removeTempChannel(guild.id, tempId, voice);
            await temp.delete().catch(() => {});
            log("cleaned up orphaned temp channel", { tempId });
          }
        }
      }
      
      return;
    }

    const category =
      guild.channels.cache.get(lobby.categoryId) ??
      (await guild.channels.fetch(lobby.categoryId).catch(() => null));
    if (!category || category.type !== ChannelType.GuildCategory) {
      log("missing category", { categoryId: lobby.categoryId });
      return;
    }
    const me = guild.members.me;
    if (me) {
      const perms = category.permissionsFor(me);
      if (!perms?.has(PermissionsBitField.Flags.ManageChannels)) {
        log("missing ManageChannels", { categoryId: category.id });
        return;
      }
      if (!perms?.has(PermissionsBitField.Flags.MoveMembers)) {
        log("missing MoveMembers", { categoryId: category.id });
        return;
      }
    }

    const lockId = `user:${member.id}`;
    const acquired = acquireCreationLock(guild.id, lockId);
    if (!acquired) {
      log("lock busy - user already creating a channel", { lockId });
      return;
    }

    try {
      // FIRST: Reuse existing temp channel if the owner already has one active.
      const ownedTempEntries = Object.entries(voice.tempChannels)
        .filter(([, data]) => data.ownerId === member.id)
        .sort((a, b) => (b[1].createdAt ?? 0) - (a[1].createdAt ?? 0));

      for (const [oldTempId] of ownedTempEntries) {
        const oldTemp =
          guild.channels.cache.get(oldTempId) ??
          (await guild.channels.fetch(oldTempId).catch(() => null));

        if (!oldTemp) {
          await removeTempChannel(guild.id, oldTempId, voice);
          log("removed stale temp channel record", { oldTempId });
          continue;
        }

        if (member.voice.channelId === oldTempId) {
          log("user already in temp channel", { oldTempId });
          return;
        }

        const humans = Array.from(oldTemp.members.values()).filter(m => !m.user?.bot).length;
        if (humans > 0) {
          await member.voice.setChannel(oldTemp).catch(() => {});
          log("reused existing temp channel", { oldTempId });
          return;
        }

        await removeTempChannel(guild.id, oldTempId, voice);
        await oldTemp.delete().catch(() => {});
        log("cleaned up empty temp channel", { oldTempId });
      }
      
      // THEN: Check if user already has a temp channel for THIS specific lobby
      const existing = await findUserTempChannel(
        guild.id,
        member.id,
        newChannel.id,
        voice
      );

      if (existing) {
        const ch = guild.channels.cache.get(existing) ?? null;
        if (ch) {
          await member.voice.setChannel(ch).catch(() => {});
          log("moved to existing temp", { tempChannelId: ch.id });
          return;
        }
        // stale record
        await removeTempChannel(guild.id, existing, voice);
      }

      const cooldownMs = Number(process.env.VOICE_CREATE_COOLDOWN_MS ?? 0);
      if (!canCreateTempChannel(guild.id, member.id, cooldownMs)) {
        log("cooldown active", { userId: member.id, cooldownMs });
        return;
      }

      const nameRaw =
        typeof lobby.nameTemplate === "string"
          ? lobby.nameTemplate.replace("{user}", member.displayName)
          : member.displayName;
      const name = nameRaw.slice(0, 90);

      const desiredBitrate =
        Number.isFinite(lobby.bitrateKbps) && lobby.bitrateKbps
          ? Math.trunc(lobby.bitrateKbps) * 1000
          : null;
      const maxBitrate = Number.isFinite(guild.maximumBitrate) ? guild.maximumBitrate : null;
      const bitrate = desiredBitrate && maxBitrate ? Math.min(desiredBitrate, maxBitrate) : desiredBitrate;

      // Enforce optional maxChannels per lobby if present
      if (Number.isInteger(lobby.maxChannels) && lobby.maxChannels > 0) {
        let count = 0;
        for (const temp of Object.values(voice.tempChannels)) {
          if (temp.lobbyId === newChannel.id) count++;
        }
        if (count >= lobby.maxChannels) {
          log("max channels reached", { lobbyId: newChannel.id, count });
          return;
        }
      }

      const channel = await guild.channels
        .create({
          name,
          type: ChannelType.GuildVoice,
          parent: category.id,
          bitrate: bitrate ?? undefined,
          userLimit: Number.isFinite(lobby.userLimit) ? Math.max(0, Math.trunc(lobby.userLimit)) : 0,
          permissionOverwrites: [
            {
              id: member.id,
              allow: [
                PermissionsBitField.Flags.ManageChannels,
                PermissionsBitField.Flags.MoveMembers
              ]
            }
          ]
        })
        .catch(err => {
          log("failed to create temp channel", { error: err?.message });
          return null;
        });

      if (!channel) {
        // Failed to create - move user back to lobby or disconnect
        await member.voice.setChannel(newChannel).catch(() => {});
        return;
      }

      await registerTempChannel(
        guild.id,
        channel.id,
        member.id,
        newChannel.id,
        voice
      );
      markTempChannelCreated(guild.id, member.id);
      log("created temp channel", { tempChannelId: channel.id });

      // Verify user is still in voice before moving them
      await member.fetch().catch(() => null);
      if (member.voice.channelId === newChannel.id) {
        await member.voice.setChannel(channel).catch(() => {});
      } else {
        log("user left voice during creation", { userId: member.id });
        // User left - cleanup the just-created channel
        const humans = Array.from(channel.members.values()).filter(m => !m.user?.bot).length;
        if (humans === 0) {
          await removeTempChannel(guild.id, channel.id, voice);
          await channel.delete().catch(() => {});
          log("deleted unused temp channel", { channelId: channel.id });
        }
      }
    } finally {
      releaseCreationLock(guild.id, lockId);
    }
  }
};
