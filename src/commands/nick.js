import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageNicknames],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("nick")
  .setDescription("Set or clear a nickname")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
  .addStringOption(o => o.setName("nickname").setDescription("New nickname").setRequired(false));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const nickname = interaction.options.getString("nickname");
  const member = await fetchTargetMember(interaction.guild, user.id);
  if (!member) {
    await replyModError(interaction, {
      title: "Nickname Update Failed",
      summary: "User is not a member of this guild."
    });
    return;
  }

  const gate = canModerateTarget(interaction, member);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Nickname Update Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  try {
    await member.setNickname(nickname || null);
    await replyModSuccess(interaction, {
      title: "Nickname Updated",
      summary: nickname
        ? `Set nickname for **${user.tag}**.`
        : `Cleared nickname for **${user.tag}**.`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "Nickname", value: nickname || "(cleared)" }
      ]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Nickname Update Failed",
      summary: err?.message || "Unable to update nickname."
    });
  }
}
