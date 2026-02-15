import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault, replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.BanMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("softban")
  .setDescription("Softban a user (ban then unban)")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false))
  .addIntegerOption(o =>
    o.setName("delete_days").setDescription("Delete message days (0-7)").setMinValue(0).setMaxValue(7)
  );

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const deleteDays = interaction.options.getInteger("delete_days") || 0;
  const targetMember = await fetchTargetMember(interaction.guild, user.id);
  const gate = canModerateTarget(interaction, targetMember);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Softban Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  try {
    await interaction.guild.members.ban(user.id, {
      reason,
      deleteMessageSeconds: deleteDays * 86400
    });
    await interaction.guild.members.unban(user.id, "Softban cleanup");
    await replyModSuccess(interaction, {
      title: "Softban Complete",
      summary: `Softbanned **${user.tag}** (ban + immediate unban).`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "Delete Message Days", value: String(deleteDays), inline: true },
        { name: "Reason", value: reason }
      ]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Softban Failed",
      summary: err?.message || "Unable to softban user."
    });
  }
}
