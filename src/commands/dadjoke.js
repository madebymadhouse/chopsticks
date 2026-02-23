import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { request } from "undici";
import { botLogger } from "../utils/modernLogger.js";

export const meta = {
  category: "fun",
  guildOnly: false,
};

export const data = new SlashCommandBuilder()
  .setName("dadjoke")
  .setDescription("Get a random dad joke 🥁");

export async function execute(interaction) {
  await interaction.deferReply();

  let joke = "Why don't scientists trust atoms? Because they make up everything!";

  try {
    const { statusCode, body } = await request("https://icanhazdadjoke.com/", {
      headers: {
        "User-Agent": "Chopsticks-Discord-Bot/1.0 (https://github.com/WokSpec/Chopsticks)",
        "Accept": "application/json"
      }
    });
    if (statusCode === 200) {
      const data = await body.json();
      if (data?.joke) joke = data.joke;
    }
  } catch (err) {
    botLogger.warn({ err }, "[dadjoke] icanhazdadjoke fetch failed — using fallback");
  }

  const embed = new EmbedBuilder()
    .setTitle("🥁 Dad Joke")
    .setDescription(joke)
    .setColor(0xff9f43)
    .setFooter({ text: "Powered by icanhazdadjoke.com" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
