import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { clearWarnings } from "../utils/moderation.js";
import { replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("clearwarns")
  .setDescription("Clear warnings for a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  await clearWarnings(interaction.guildId, user.id);
  await replyModSuccess(interaction, {
    title: "Warnings Cleared",
    summary: `Cleared all warnings for **${user.tag}**.`,
    fields: [{ name: "User", value: `${user.tag} (${user.id})` }]
  });
}
