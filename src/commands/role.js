import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { canModerateTarget, fetchTargetMember, moderationGuardMessage } from "../moderation/guards.js";
import { replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageRoles],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Role management")
  .addSubcommand(s =>
    s
      .setName("add")
      .setDescription("Add a role to a user")
      .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("remove")
      .setDescription("Remove a role from a user")
      .addUserOption(o => o.setName("user").setDescription("User").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role").setRequired(true))
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const user = interaction.options.getUser("user", true);
  const role = interaction.options.getRole("role", true);
  const member = await fetchTargetMember(interaction.guild, user.id);
  if (!member) {
    await replyModError(interaction, {
      title: "Role Update Failed",
      summary: "User is not a member of this guild."
    });
    return;
  }

  const gate = canModerateTarget(interaction, member);
  if (!gate.ok) {
    await replyModError(interaction, {
      title: "Role Update Blocked",
      summary: moderationGuardMessage(gate.reason)
    });
    return;
  }

  const botHighest = interaction.guild.members.me?.roles?.highest?.position ?? -1;
  const actorHighest = interaction.member?.roles?.highest?.position ?? -1;
  const rolePosition = role?.position ?? -1;
  if (rolePosition >= actorHighest) {
    await replyModError(interaction, {
      title: "Role Update Blocked",
      summary: "Your highest role must be above the target role."
    });
    return;
  }
  if (rolePosition >= botHighest) {
    await replyModError(interaction, {
      title: "Role Update Blocked",
      summary: "Bot role hierarchy is below the target role."
    });
    return;
  }

  if (sub === "add") {
    try {
      await member.roles.add(role);
      await replyModSuccess(interaction, {
        title: "Role Added",
        summary: `Added **${role.name}** to **${user.tag}**.`,
        fields: [
          { name: "User", value: `${user.tag} (${user.id})` },
          { name: "Role", value: `${role.name} (${role.id})` }
        ]
      });
    } catch (err) {
      await replyModError(interaction, {
        title: "Role Update Failed",
        summary: err?.message || "Unable to add role."
      });
    }
    return;
  }
  if (sub === "remove") {
    try {
      await member.roles.remove(role);
      await replyModSuccess(interaction, {
        title: "Role Removed",
        summary: `Removed **${role.name}** from **${user.tag}**.`,
        fields: [
          { name: "User", value: `${user.tag} (${user.id})` },
          { name: "Role", value: `${role.name} (${role.id})` }
        ]
      });
    } catch (err) {
      await replyModError(interaction, {
        title: "Role Update Failed",
        summary: err?.message || "Unable to remove role."
      });
    }
    return;
  }
}
