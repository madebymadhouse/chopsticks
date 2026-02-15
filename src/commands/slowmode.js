import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { replyModError, replyModSuccess } from "../moderation/output.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageChannels],
  category: "mod"
};

export const data = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set slowmode for current channel")
  .addIntegerOption(o =>
    o.setName("seconds").setDescription("0-21600").setRequired(true).setMinValue(0).setMaxValue(21600)
  );

export async function execute(interaction) {
  const seconds = interaction.options.getInteger("seconds", true);
  const channel = interaction.channel;
  if (!channel?.setRateLimitPerUser) {
    await replyModError(interaction, {
      title: "Slowmode Failed",
      summary: "This channel does not support slowmode changes."
    });
    return;
  }
  try {
    await channel.setRateLimitPerUser(seconds);
    await replyModSuccess(interaction, {
      title: "Slowmode Updated",
      summary: `Set slowmode for <#${channel.id}> to **${seconds}s**.`,
      fields: [{ name: "Channel", value: `${channel.name || channel.id} (${channel.id})` }]
    });
  } catch (err) {
    await replyModError(interaction, {
      title: "Slowmode Failed",
      summary: err?.message || "Unable to set slowmode."
    });
  }
}
