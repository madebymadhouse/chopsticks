import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getWeather, wmoLabel } from "../utils/openmeteo.js";
import { withTimeout } from "../utils/interactionTimeout.js";

export const meta = {
  deployGlobal: false,
  category: "utility",
  guildOnly: false,
};

export const data = new SlashCommandBuilder()
  .setName("weather")
  .setDescription("Current weather for any location (powered by Open-Meteo, no API key needed)")
  .addStringOption(o =>
    o.setName("location")
      .setDescription("City, region, or country (e.g. Tokyo, New York, Germany)")
      .setRequired(true)
  );

export async function execute(interaction) {
  await interaction.deferReply();
  await withTimeout(interaction, async () => {
  const location = interaction.options.getString("location", true).trim();

  // Try to use the shared Redis client if available
  let redisClient = null;
  try {
    const { getClient } = await import("../utils/cache.js");
    redisClient = getClient?.() ?? null;
  } catch {}

  const weather = await getWeather(location, redisClient);

  if (!weather) {
    return interaction.editReply({
      content: `❌ Couldn't find weather data for **${location}**. Try a more specific city name.`
    });
  }

  const [emoji, label] = wmoLabel(weather.current.wmo);
  const { temp, feels_like, humidity, wind_kph } = weather.current;
  const { high, low } = weather.daily;

  const embed = new EmbedBuilder()
    .setTitle(`${emoji} Weather — ${weather.display_name.split(",")[0]}`)
    .setDescription(`**${label}**\n📍 ${weather.display_name}`)
    .setColor(0x5eb8ff)
    .addFields(
      { name: "🌡️ Temperature", value: `${temp}°C (feels ${feels_like}°C)`, inline: true },
      { name: "💧 Humidity", value: `${humidity}%`, inline: true },
      { name: "💨 Wind", value: `${wind_kph} km/h`, inline: true },
      { name: "📈 Today High/Low", value: `${high}°C / ${low}°C`, inline: true }
    )
    .setFooter({ text: "Powered by Open-Meteo & OpenStreetMap · Data refreshes every 15 min" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
  }, { label: "weather" });
}
