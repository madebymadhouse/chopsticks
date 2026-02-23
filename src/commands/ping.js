import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check bot latency");

export async function execute(interaction) {
  const start = Date.now();
  await interaction.reply({ content: "🏓 Measuring...", flags: MessageFlags.Ephemeral });
  const roundTrip = Date.now() - start;
  const wsPing = Math.round(interaction.client.ws.ping);
  const uptimeMs = interaction.client.uptime ?? 0;

  const color = roundTrip < 100 ? 0x57f287 : roundTrip < 300 ? 0xfee75c : 0xed4245;

  const uptimeParts = [];
  const days = Math.floor(uptimeMs / 86_400_000);
  const hours = Math.floor((uptimeMs % 86_400_000) / 3_600_000);
  const mins = Math.floor((uptimeMs % 3_600_000) / 60_000);
  if (days) uptimeParts.push(`${days}d`);
  if (hours) uptimeParts.push(`${hours}h`);
  uptimeParts.push(`${mins}m`);

  const embed = new EmbedBuilder()
    .setTitle("🏓 Pong!")
    .setColor(color)
    .addFields(
      { name: "Round-trip", value: `\`${roundTrip}ms\``, inline: true },
      { name: "WS Ping", value: `\`${wsPing}ms\``, inline: true },
      { name: "Uptime", value: `\`${uptimeParts.join(" ")}\``, inline: true }
    )
    .setTimestamp();

  await interaction.editReply({ content: "", embeds: [embed] });
}
