import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault } from "../moderation/output.js";
import { dispatchModerationLog } from "../utils/modLogs.js";
import { replyError } from "../utils/discordOutput.js";
import { EmbedBuilder } from "discord.js";
import { Colors } from "../utils/discordOutput.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.BanMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("massban")
  .setDescription("Ban multiple users at once by user ID")
  .addStringOption(o =>
    o.setName("users").setDescription("Comma or space-separated user IDs (max 20)").setRequired(true)
  )
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addIntegerOption(o =>
    o.setName("delete_days").setDescription("Delete message days (0-7)").setMinValue(0).setMaxValue(7)
  )
  .addBooleanOption(o =>
    o.setName("notify_user").setDescription("Attempt to DM each user before ban")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

const SNOWFLAKE_RE = /^\d{17,19}$/;

function parseUserIds(input) {
  return String(input || "")
    .split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export async function execute(interaction) {
  const usersInput = interaction.options.getString("users", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const deleteDays = interaction.options.getInteger("delete_days") ?? 0;

  const ids = parseUserIds(usersInput);

  const invalid = ids.filter(id => !SNOWFLAKE_RE.test(id));
  if (invalid.length) {
    await replyError(interaction, "Invalid User IDs", `The following are not valid Discord user IDs: ${invalid.join(", ")}`);
    return;
  }

  if (ids.length === 0) {
    await replyError(interaction, "No Users", "Please provide at least one user ID.");
    return;
  }

  if (ids.length > 20) {
    await replyError(interaction, "Too Many Users", `You can only ban up to 20 users at once. Provided: ${ids.length}`);
    return;
  }

  const successes = [];
  const failures = [];

  for (const userId of ids) {
    if (userId === interaction.user.id) {
      failures.push({ id: userId, reason: "Cannot ban yourself" });
      continue;
    }

    const targetMember = await fetchTargetMember(interaction.guild, userId);
    const gate = canModerateTarget(interaction, targetMember);

    if (!gate.ok) {
      failures.push({ id: userId, reason: moderationGuardMessage(gate.reason) });
      await dispatchModerationLog(interaction.guild, {
        action: "ban",
        ok: false,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        targetId: userId,
        targetTag: targetMember?.user?.tag ?? userId,
        reason,
        summary: moderationGuardMessage(gate.reason),
        commandName: "massban",
        channelId: interaction.channelId
      });
      continue;
    }

    try {
      await interaction.guild.members.ban(userId, {
        reason,
        deleteMessageSeconds: deleteDays * 86400
      });
      successes.push(userId);
      await dispatchModerationLog(interaction.guild, {
        action: "ban",
        ok: true,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        targetId: userId,
        targetTag: targetMember?.user?.tag ?? userId,
        reason,
        summary: `Mass banned ${userId}.`,
        commandName: "massban",
        channelId: interaction.channelId,
        details: { deleteDays: String(deleteDays) }
      });
    } catch (err) {
      failures.push({ id: userId, reason: err?.message || "Ban failed" });
      await dispatchModerationLog(interaction.guild, {
        action: "ban",
        ok: false,
        actorId: interaction.user.id,
        actorTag: interaction.user.tag,
        targetId: userId,
        targetTag: targetMember?.user?.tag ?? userId,
        reason,
        summary: err?.message || "Ban failed",
        commandName: "massban",
        channelId: interaction.channelId
      });
    }
  }

  const embed = new EmbedBuilder()
    .setTitle(`Mass Ban — ${successes.length}/${ids.length} users banned`)
    .setColor(successes.length === ids.length ? Colors.SUCCESS : failures.length === ids.length ? Colors.ERROR : Colors.WARNING)
    .setTimestamp();

  if (successes.length) {
    embed.addFields({ name: "✅ Banned", value: successes.map(id => `\`${id}\``).join("\n").slice(0, 1024) });
  }
  if (failures.length) {
    embed.addFields({
      name: "❌ Failed",
      value: failures.map(f => `\`${f.id}\`: ${f.reason}`).join("\n").slice(0, 1024)
    });
  }
  embed.addFields({ name: "Reason", value: reason });

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.reply({ embeds: [embed], flags: 64 });
  }
}
