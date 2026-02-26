import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { cacheGet, cacheSet, getRedis } from "../utils/cache.js";
import { sanitizeString } from "../utils/validation.js";

export const meta = {
  deployGlobal: false,
  category: "utility",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("afk")
  .setDescription("Set or clear your AFK status — bot will notify others who mention you")
  .addStringOption(opt =>
    opt.setName("reason")
      .setDescription("Why you're going AFK (leave blank to clear AFK)")
      .setMaxLength(150)
      .setRequired(false)
  );

async function clearAfk(key) {
  try {
    const rc = getRedis();
    if (rc) { await rc.del(key); return; }
  } catch {}
  // Fallback: expire immediately
  await cacheSet(key, "", 1).catch(() => {});
}

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const reason = sanitizeString(interaction.options.getString("reason"));
  const key = `afk:${guildId}:${userId}`;

  const existing = await cacheGet(key).catch(() => null);

  if (!reason) {
    // Clear AFK
    if (existing) {
      await clearAfk(key);
      const embed = new EmbedBuilder()
        .setTitle("✅ AFK Cleared")
        .setDescription("Welcome back! Your AFK status has been removed.")
        .setColor(0x57f287)
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      return interaction.reply({
        content: "You're not currently AFK. Provide a reason to go AFK.",
        ephemeral: true
      });
    }
  }

  const payload = JSON.stringify({ reason, since: Date.now() });
  // Store for up to 24 hours
  await cacheSet(key, payload, 86400).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle("💤 AFK Set")
    .setDescription(`You're now AFK: **${reason}**\nI'll let others know if they mention you.`)
    .setColor(0xfee75c)
    .setFooter({ text: "Your AFK will clear automatically when you next send a message" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
