import { SlashCommandBuilder, EmbedBuilder, MessageFlags, version as djsVersion } from "discord.js";

export const meta = {
  category: "util",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("botinfo")
  .setDescription("Show bot info and live stats");

export async function execute(interaction) {
  const client = interaction.client;
  const uptimeMs = client.uptime ?? 0;
  const days = Math.floor(uptimeMs / 86_400_000);
  const hours = Math.floor((uptimeMs % 86_400_000) / 3_600_000);
  const mins = Math.floor((uptimeMs % 3_600_000) / 60_000);
  const secs = Math.floor((uptimeMs % 60_000) / 1_000);
  const uptime = [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`, `${secs}s`]
    .filter(Boolean).join(" ");

  const memMB = (process.memoryUsage().rss / 1_048_576).toFixed(1);
  const agentCount = global.agentManager?.liveAgents?.size ?? 0;

  let poolCount = "—";
  try {
    const { listPools } = await import("../utils/storage_pg.js");
    const pools = await listPools();
    poolCount = String(pools?.length ?? 0);
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle("🥢 Chopsticks — Bot Info")
    .setColor(0x5865f2)
    .setThumbnail(client.user.displayAvatarURL())
    .addFields(
      { name: "🏠 Guilds", value: String(client.guilds.cache.size), inline: true },
      { name: "👥 Users (cached)", value: String(client.users.cache.size), inline: true },
      { name: "🤖 Active Agents", value: String(agentCount), inline: true },
      { name: "🌊 Pools", value: poolCount, inline: true },
      { name: "🧠 Memory", value: `${memMB} MB`, inline: true },
      { name: "⏱️ Uptime", value: uptime, inline: true },
      { name: "📦 discord.js", value: `v${djsVersion}`, inline: true },
      { name: "🟩 Node.js", value: process.version, inline: true },
    )
    .setFooter({ text: client.user.tag })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
