import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { addWarning } from "../utils/moderation.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { reasonOrDefault, replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("reason").setDescription("Reason").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const reason = reasonOrDefault(interaction.options.getString("reason"));
  const targetMember = await fetchTargetMember(interaction.guild, user.id);
  const gate = canModerateTarget(interaction, targetMember);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Warn Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }
  const list = await addWarning(interaction.guildId, user.id, interaction.user.id, reason);
  await replyModSuccess(interaction, {
    title: "User Warned",
    summary: `Warning recorded for **${user.tag}**.`,
    fields: [
      { name: "User", value: `${user.tag} (${user.id})` },
      { name: "Total Warnings", value: String(list.length), inline: true },
      { name: "Reason", value: reason }
    ]
  });
}
