import { runGuildEventAutomations } from "../utils/automations.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export default {
  name: "guildMemberRemove",

  async execute(member) {
    const guild = member?.guild;
    if (!guild) return;

    // Automations hook
    try {
      await runGuildEventAutomations({
        guild,
        eventKey: "member_leave",
        user: member.user,
        member
      });
    } catch {}

    // Goodbye message
    try {
      const gd = await loadGuildData(guild.id);
      const goodbye = gd?.goodbye;
      if (goodbye?.enabled && goodbye.channelId) {
        const ch = guild.channels.cache.get(goodbye.channelId);
        if (ch?.isTextBased()) {
          const msg = (goodbye.message ?? "Goodbye {user}.")
            .replace(/\{user\}/g, member.user.tag)
            .replace(/\{username\}/g, member.user.username)
            .replace(/\{server\}/g, guild.name)
            .replace(/\{membercount\}/g, String(guild.memberCount));
          await ch.send(msg.slice(0, 2000)).catch(() => null);
        }
      }

      // Update member count VC
      if (gd?.memberCountChannelId) {
        const vc = guild.channels.cache.get(gd.memberCountChannelId);
        if (vc) await vc.setName(`Members: ${guild.memberCount}`).catch(() => null);
      }
    } catch {}

    // Analytics: track leaves per day
    (async () => {
      try {
        const gd = await loadGuildData(guild.id);
        const key = new Date().toISOString().slice(0, 10);
        gd.analytics ??= {};
        gd.analytics.memberLeaves ??= {};
        gd.analytics.memberLeaves[key] = (gd.analytics.memberLeaves[key] ?? 0) + 1;
        const days = Object.keys(gd.analytics.memberLeaves).sort();
        if (days.length > 30) delete gd.analytics.memberLeaves[days[0]];
        await saveGuildData(guild.id, gd);
      } catch {}
    })();
  }
};

