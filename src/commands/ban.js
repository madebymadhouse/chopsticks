import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault, replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.BanMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addIntegerOption(o =>
    o.setName("delete_days").setDescription("Delete message days (0-7)").setMinValue(0).setMaxValue(7)
  )
  .addBooleanOption(o =>
    o.setName("notify_user").setDescription("Attempt to DM user before ban")
  );

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const deleteDays = interaction.options.getInteger("delete_days") || 0;
  const notifyUser = Boolean(interaction.options.getBoolean("notify_user"));
  const targetMember = await fetchTargetMember(interaction.guild, user.id);

  const gate = canModerateTarget(interaction, targetMember);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Ban Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  let dmStatus = "not-requested";
  if (notifyUser) {
    dmStatus = await user.send(`You were banned from **${interaction.guild?.name || "this server"}**.\nReason: ${reason}`)
      .then(() => "sent")
      .catch(() => "failed");
  }

  try {
    await interaction.guild.members.ban(user.id, {
      reason,
      deleteMessageSeconds: deleteDays * 86400
    });
    await replyModSuccess(interaction, {
      title: "User Banned",
      summary: `Successfully banned **${user.tag}**.`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "Delete Message Days", value: String(deleteDays), inline: true },
        { name: "DM Notify", value: dmStatus, inline: true },
        { name: "Reason", value: reason }
      ]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Ban Failed",
      summary: err?.message || "Unable to ban user."
    });
  }
}
