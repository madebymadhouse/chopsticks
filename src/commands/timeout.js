import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault, replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a member")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addIntegerOption(o =>
    o.setName("minutes").setDescription("Minutes (0 to clear)").setRequired(true).setMinValue(0).setMaxValue(10080)
  )
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addBooleanOption(o =>
    o.setName("notify_user").setDescription("Attempt to DM user about timeout")
  );

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const minutes = interaction.options.getInteger("minutes", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const notifyUser = Boolean(interaction.options.getBoolean("notify_user"));
  const member = await fetchTargetMember(interaction.guild, user.id);
  if (!member) {
    await replyModError(interaction, {
      title: "Timeout Failed",
      summary: "User is not a member of this guild."
    });
    return;
  }

  const gate = canModerateTarget(interaction, member);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Timeout Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  let dmStatus = "not-requested";
  if (notifyUser) {
    const dmReason = minutes === 0
      ? `Your timeout was cleared in **${interaction.guild?.name || "this server"}**.`
      : `You were timed out in **${interaction.guild?.name || "this server"}** for ${minutes} minute(s).\nReason: ${reason}`;
    dmStatus = await user.send(dmReason).then(() => "sent").catch(() => "failed");
  }

  const ms = minutes === 0 ? null : minutes * 60 * 1000;
  try {
    await member.timeout(ms, reason);
    await replyModSuccess(interaction, {
      title: minutes === 0 ? "Timeout Cleared" : "User Timed Out",
      summary: minutes === 0
        ? `Cleared timeout for **${user.tag}**.`
        : `Timed out **${user.tag}** for **${minutes} minute(s)**.`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "DM Notify", value: dmStatus, inline: true },
        { name: "Reason", value: reason }
      ]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Timeout Failed",
      summary: err?.message || "Unable to apply timeout."
    });
  }
}
