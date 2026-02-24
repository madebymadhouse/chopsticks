import { loadGuildData } from "../utils/storage.js";
import { maybeBuildGuildFunLine } from "../fun/integrations.js";
import { maybeSyncMemberLevelRoleRewards } from "../game/levelRewards.js";
import { runGuildEventAutomations } from "../utils/automations.js";
import { eventBus, Events } from "../utils/eventBus.js";
import { buildWelcomeCardSvg } from "../game/render/cards.js";
import { svgToPngBuffer } from "../game/render/imCards.js";

export default {
  name: "guildMemberAdd",

  async execute(member) {
    const guildId = member.guild?.id;
    if (!guildId) return;
    const data = await loadGuildData(guildId);

    // Auto-role
    try {
      const ar = data.autorole;
      if (ar?.enabled && ar.roleId) {
        const role = member.guild.roles.cache.get(ar.roleId) ?? null;
        if (role) await member.roles.add(role).catch(() => {});
      }
    } catch {}

    // Welcome
    try {
      const w = data.welcome;
      if (w?.enabled && w.channelId) {
        const ch = member.guild.channels.cache.get(w.channelId);
        if (ch && ch.send) {
          const baseText = String(w.message || "Welcome {user}!").replace("{user}", `<@${member.id}>`);
          const flavor = await maybeBuildGuildFunLine({
            guildId,
            feature: "welcome",
            actorTag: "chopsticks",
            target: member.user?.username || member.displayName || member.id,
            intensity: 3,
            maxLength: 160,
            context: { guildName: member.guild?.name || "" }
          });
          const text = `${baseText}${flavor ? `\n${flavor}` : ""}`.slice(0, 1900);

          // Try to attach a welcome card image
          let cardAttachment = null;
          try {
            const memberCount = member.guild.memberCount || 0;
            const svg = buildWelcomeCardSvg({
              username: member.user?.username || member.displayName || "New Member",
              memberCount,
              serverName: member.guild.name || "Server",
              avatarInitial: (member.user?.username || "?")[0],
            });
            const png = await svgToPngBuffer(svg);
            if (png) {
              const { AttachmentBuilder } = await import("discord.js");
              cardAttachment = new AttachmentBuilder(png, { name: "welcome.png" });
            }
          } catch { /* card is optional — never break welcome msg */ }

          await ch.send({ content: text, files: cardAttachment ? [cardAttachment] : [] });
        }
      }
    } catch {}

    // Level reward sync (best effort)
    try {
      await maybeSyncMemberLevelRoleRewards(member, { guildData: data, force: true });
    } catch {}

    // Event automations
    try {
      await runGuildEventAutomations({
        guild: member.guild,
        eventKey: "member_join",
        user: member.user,
        member
      });
    } catch {}

    // Fire event bus
    eventBus.fire(Events.MEMBER_JOINED, {
      userId: member.id,
      guildId,
      memberCount: member.guild.memberCount || 0,
    });

    // Verification system — assign quarantine role and optionally DM
    try {
      const { getVerifyConfig } = await import("../tools/verify/setup.js");
      const { verify } = await getVerifyConfig(guildId);
      if (verify?.enabled && verify.quarantineRoleId) {
        const quarRole = member.guild.roles.cache.get(verify.quarantineRoleId)
          ?? await member.guild.roles.fetch(verify.quarantineRoleId).catch(() => null);
        if (quarRole) await member.roles.add(quarRole, "Verification — quarantine role").catch(() => null);

        // DM on join if configured
        if (verify.dmMessage) {
          await member.user.send(verify.dmMessage).catch(() => null);
        }

        // Schedule auto-kick for unverified after timeoutHours
        if (verify.timeoutHours > 0) {
          const ms = verify.timeoutHours * 60 * 60 * 1000;
          setTimeout(async () => {
            try {
              const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
              if (!freshMember) return;
              const { gd: freshGd } = await getVerifyConfig(guildId);
              const freshVerify = freshGd.verify;
              if (!freshVerify?.enabled) return;
              // If still has quarantine role → still unverified → kick
              if (freshMember.roles.cache.has(freshVerify.quarantineRoleId)) {
                await freshMember.kick("Verification timeout — did not verify in time").catch(() => null);
              }
            } catch { /* best-effort */ }
          }, ms);
        }
      }
    } catch { /* verify system must not break member add */ }

    // Analytics: track joins per day + update member count VC
    (async () => {
      try {
        const { loadGuildData, saveGuildData } = await import("../utils/storage.js");
        const gd = await loadGuildData(member.guild.id);
        const key = new Date().toISOString().slice(0, 10);
        gd.analytics ??= {};
        gd.analytics.memberJoins ??= {};
        gd.analytics.memberJoins[key] = (gd.analytics.memberJoins[key] ?? 0) + 1;
        const days = Object.keys(gd.analytics.memberJoins).sort();
        if (days.length > 30) delete gd.analytics.memberJoins[days[0]];
        // Member count VC
        if (gd.memberCountChannelId) {
          const vc = member.guild.channels.cache.get(gd.memberCountChannelId);
          if (vc) await vc.setName(`Members: ${member.guild.memberCount}`).catch(() => null);
        }
        await saveGuildData(member.guild.id, gd);
      } catch {}
    })();
  }
};
