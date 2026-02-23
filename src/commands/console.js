import { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from "discord.js";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";

const CONSOLE_TOKEN_TTL = 10 * 60; // 10 minutes

function safeSlug(v) { return /^[a-zA-Z0-9-]+$/.test(String(v || '')) ? v : null; }
function safeUrl(v) {
  try { const u = new URL(v); return (u.protocol === 'http:' || u.protocol === 'https:') ? u.origin : null; }
  catch { return null; }
}

function getDashboardUrl() {
  const explicit = String(process.env.DASHBOARD_BASE_URL || "").trim();
  if (explicit) return safeUrl(explicit) ?? explicit.replace(/\/+$/g, "");

  // Mirror the server-side auto-detection so the bot generates the right link
  const railway = safeSlug(process.env.RAILWAY_STATIC_URL);
  if (railway) return `https://${railway}`;
  const render = process.env.RENDER_EXTERNAL_URL && safeUrl(process.env.RENDER_EXTERNAL_URL);
  if (render) return render;
  const fly = safeSlug(process.env.FLY_APP_NAME);
  if (fly) return `https://${fly}.fly.dev`;
  const heroku = safeSlug(process.env.HEROKU_APP_NAME);
  if (heroku) return `https://${heroku}.herokuapp.com`;
  const koyeb = safeSlug(process.env.KOYEB_PUBLIC_DOMAIN);
  if (koyeb) return `https://${koyeb}`;
  const pub = process.env.PUBLIC_URL && safeUrl(process.env.PUBLIC_URL);
  if (pub) return pub;

  const port = process.env.DASHBOARD_PORT || 8788;
  return `http://localhost:${port}`;
}

function getJwtSecret() {
  const explicit = String(process.env.DASHBOARD_SECRET || "").trim();
  if (explicit) return explicit;

  const botToken = String(process.env.DISCORD_TOKEN || "").trim();
  if (botToken) {
    return createHash("sha256").update(botToken + "chopsticks-console-v1").digest("hex").slice(0, 32);
  }
  throw new Error("DISCORD_TOKEN is not set — cannot derive console secret.");
}

export const meta = { category: "utility" };

export const data = new SlashCommandBuilder()
  .setName("console")
  .setDescription("Open your server's Chopsticks control panel in a browser")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction) {
  const baseUrl = getDashboardUrl();

  let secret;
  try {
    secret = getJwtSecret();
  } catch (err) {
    return interaction.reply({
      content: `❌ ${err.message}`,
      ephemeral: true,
    });
  }

  const guildId = interaction.guildId;
  const userId = interaction.user.id;
  const tokenId = `${userId}-${guildId}-${Date.now()}`;

  const token = jwt.sign(
    {
      jti: tokenId,
      userId,
      guildId,
      username: interaction.user.username,
      avatarHash: interaction.user.avatar,
    },
    secret,
    { expiresIn: `${CONSOLE_TOKEN_TTL}s` }
  );

  const consoleUrl = `${baseUrl}/console-auth?token=${encodeURIComponent(token)}`;

  const button = new ButtonBuilder()
    .setLabel("Open Console")
    .setStyle(ButtonStyle.Link)
    .setURL(consoleUrl)
    .setEmoji("🖥️");

  const row = new ActionRowBuilder().addComponents(button);

  return interaction.reply({
    content:
      `### 🖥️ Chopsticks Console\nYour personalized control panel for **${interaction.guild?.name ?? "this server"}** is ready.\n` +
      `> ⏱️ This link expires in **10 minutes** and can only be used once.\n` +
      `> 🔒 Only you can access this session.`,
    components: [row],
    ephemeral: true,
  });
}

