// src/commands/pay.js
import { SlashCommandBuilder } from "discord.js";
import { makeEmbed, Colors } from "../utils/discordOutput.js";
import { transferCredits } from "../economy/wallet.js";
import { botLogger } from "../utils/modernLogger.js";

export const meta = {
  deployGlobal: false,
  category: "economy",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("pay")
  .setDescription("Transfer credits to another user")
  .addUserOption(o => o.setName("user").setDescription("User to pay").setRequired(true))
  .addIntegerOption(o => o.setName("amount").setDescription("Amount to transfer").setRequired(true).setMinValue(1));

export async function execute(interaction) {
  const targetUser = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount");
  
  if (targetUser.bot) {
    await interaction.reply({
      embeds: [makeEmbed("Error", "You cannot pay bots.", [], null, null, Colors.ERROR)],
      ephemeral: true
    });
    return;
  }
  
  if (targetUser.id === interaction.user.id) {
    await interaction.reply({
      embeds: [makeEmbed("Error", "You cannot pay yourself.", [], null, null, Colors.ERROR)],
      ephemeral: true
    });
    return;
  }
  
  try {
    const result = await transferCredits(interaction.user.id, targetUser.id, amount, "pay");
    
    if (!result.ok) {
      if (result.reason === "insufficient") {
        await interaction.reply({
          embeds: [makeEmbed("Insufficient Funds", "You don't have enough credits.", [], null, null, Colors.ERROR)],
          ephemeral: true
        });
        return;
      }
    }
    
    const embed = makeEmbed(
      "Payment Sent",
      `Successfully sent **${amount.toLocaleString()} Credits** to ${targetUser.username}`,
      [],
      null,
      null,
      Colors.SUCCESS
    );
    
    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    botLogger.error({ err }, "[pay] Error");
    await interaction.reply({
      embeds: [makeEmbed("Error", "Failed to process payment.", [], null, null, Colors.ERROR)],
      ephemeral: true
    });
  }
}
