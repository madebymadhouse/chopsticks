import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { Colors, replyEmbed, replySuccess, replyError } from "../utils/discordOutput.js";

export const meta = {
  deployGlobal: false,
  category: "social",
  guildOnly: true
};

/**
 * Calculate updated streak state given a last check-in date and current count.
 * @param {string|null} lastDate - ISO date string (YYYY-MM-DD, UTC) of last check-in
 * @param {number} count - current streak count
 * @returns {{ count: number, lastDate: string, status: 'incremented'|'already_claimed'|'reset' }}
 */
export function calcStreak(lastDate, count) {
  const today = new Date().toISOString().slice(0, 10);

  if (lastDate === today) {
    return { count, lastDate, status: "already_claimed" };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (lastDate === yesterday) {
    return { count: count + 1, lastDate: today, status: "incremented" };
  }

  // Gap > 1 day or no prior date — reset
  return { count: 1, lastDate: today, status: "reset" };
}

export const data = new SlashCommandBuilder()
  .setName("streak")
  .setDescription("Track your daily activity streak in this server")
  .addSubcommand(sub =>
    sub.setName("check").setDescription("Check in and view your current streak")
  )
  .addSubcommand(sub =>
    sub.setName("leaderboard").setDescription("View the top 10 streak holders in this server")
  )
  .addSubcommand(sub =>
    sub.setName("reset")
      .setDescription("Reset a user's streak (Manage Server required)")
      .addUserOption(o =>
        o.setName("target").setDescription("User whose streak to reset").setRequired(true)
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const guildData = await loadGuildData(interaction.guildId);
  if (!guildData.streaks) guildData.streaks = {};

  if (sub === "check") {
    const userId = interaction.user.id;
    const existing = guildData.streaks[userId] ?? { count: 0, lastDate: null };
    const result = calcStreak(existing.lastDate, existing.count);

    if (result.status !== "already_claimed") {
      guildData.streaks[userId] = { count: result.count, lastDate: result.lastDate };
      await saveGuildData(interaction.guildId, guildData);
      if (result.status === "incremented" || result.status === "reset") {
        void (async () => {
          try {
            const { addGuildXp } = await import('../game/guildXp.js');
            await addGuildXp(userId, interaction.guildId, 'daily', { client: interaction.client }).catch(() => {});
          } catch {}
        })();
      }
    }

    const statusLine =
      result.status === "incremented" ? "🔥 Streak extended!" :
      result.status === "reset"       ? "💔 Streak reset — you missed a day." :
                                        "✅ Already checked in today.";

    return replyEmbed(
      interaction,
      "🔥 Daily Streak",
      `${statusLine}\n\nCurrent streak: **${result.count}** day(s)`,
      false,
      Colors.Info
    );
  }

  if (sub === "leaderboard") {
    const entries = Object.entries(guildData.streaks)
      .filter(([, v]) => v?.count > 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    if (entries.length === 0) {
      return replyEmbed(interaction, "🔥 Streak Leaderboard", "No streak data yet — be the first to check in!", false, Colors.Neutral);
    }

    const lines = entries.map(([id, v], i) => `${i + 1}. <@${id}> — **${v.count}** day(s)`);
    return replyEmbed(interaction, "🔥 Streak Leaderboard", lines.join("\n"), false, Colors.Info);
  }

  if (sub === "reset") {
    const hasPerms =
      interaction.member?.permissions?.has?.(PermissionFlagsBits.ManageGuild) ||
      interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator);

    if (!hasPerms) {
      return replyError(interaction, "You need the **Manage Server** permission to reset streaks.");
    }

    const target = interaction.options.getUser("target", true);
    guildData.streaks[target.id] = { count: 0, lastDate: null };
    await saveGuildData(interaction.guildId, guildData);
    return replySuccess(interaction, `✅ Streak reset for <@${target.id}>.`);
  }
}
