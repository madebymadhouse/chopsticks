import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault, replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.KickMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a member")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addBooleanOption(o =>
    o.setName("notify_user").setDescription("Attempt to DM user before kick")
  );

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const notifyUser = Boolean(interaction.options.getBoolean("notify_user"));
  const member = await fetchTargetMember(interaction.guild, user.id);
  if (!member) {
    await replyModError(interaction, {
      title: "Kick Failed",
      summary: "User is not a member of this guild."
    });
    return;
  }

  const gate = canModerateTarget(interaction, member);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Kick Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  let dmStatus = "not-requested";
  if (notifyUser) {
    dmStatus = await user.send(`You were kicked from **${interaction.guild?.name || "this server"}**.\nReason: ${reason}`)
      .then(() => "sent")
      .catch(() => "failed");
  }

  try {
    await member.kick(reason);
    await replyModSuccess(interaction, {
      title: "User Kicked",
      summary: `Successfully kicked **${user.tag}**.`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "DM Notify", value: dmStatus, inline: true },
        { name: "Reason", value: reason }
      ]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Kick Failed",
      summary: err?.message || "Unable to kick user."
    });
  }
}
