import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageChannels],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock the current channel");

export async function execute(interaction) {
  if (!interaction.inGuild()) return;
  const channel = interaction.channel;
  if (!channel?.permissionOverwrites) {
    await replyModError(interaction, {
      title: "Lock Failed",
      summary: "This channel does not support permission overwrites."
    });
    return;
  }
  try {
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false
    });
    await replyModSuccess(interaction, {
      title: "Channel Locked",
      summary: `Locked <#${channel.id}> for @everyone.`,
      fields: [{ name: "Channel", value: `${channel.name || channel.id} (${channel.id})` }]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Lock Failed",
      summary: err?.message || "Unable to lock channel."
    });
  }
}
