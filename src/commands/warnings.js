import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { listWarnings } from "../utils/moderation.js";
import { buildModEmbed, replyModEmbed } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ModerateMembers],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("warnings")
  .setDescription("List warnings for a user")
  .addUserOption(o => o.setName("user").setDescription("User").setRequired(true));

export async function execute(interaction) {
  const user = interaction.options.getUser("user", true);
  const list = await listWarnings(interaction.guildId, user.id);
  if (list.length === 0) {
    await replyModEmbed(interaction, {
      embeds: [buildModEmbed({
        title: "Warnings",
        summary: `No warnings found for **${user.tag}**.`,
        fields: [{ name: "User", value: `${user.tag} (${user.id})` }],
        actor: interaction.user?.tag || interaction.user?.username
      })]
    });
    return;
  }
  const lines = list.slice(0, 10).map((w, i) => {
    const when = w.at ? `<t:${Math.floor(w.at / 1000)}:R>` : "unknown";
    return `${i + 1}. ${when} by <@${w.by}> - ${w.reason}`;
  });
  await replyModEmbed(interaction, {
    embeds: [buildModEmbed({
      title: "Warnings",
      summary: `Showing ${Math.min(list.length, 10)} of ${list.length} warnings for **${user.tag}**.`,
      fields: [
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "Warning Log", value: lines.join("\n") }
      ],
      actor: interaction.user?.tag || interaction.user?.username
    })]
  });
}
