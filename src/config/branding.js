// src/config/branding.js
// ─────────────────────────────────────────────────────────────────────────────
// FORK-FRIENDLY BRANDING CONFIG
// ─────────────────────────────────────────────────────────────────────────────
// Self-hosters: edit this file to rebrand the bot entirely.
// Everything here is also overridable via environment variables.
// ─────────────────────────────────────────────────────────────────────────────

export const Branding = {
  name:          process.env.BOT_NAME        ?? "Chopsticks",
  tagline:       process.env.BOT_TAGLINE     ?? "A production-grade Discord bot by WokSpec",
  supportServer: process.env.SUPPORT_SERVER_URL ?? "https://discord.gg/chopsticks",
  inviteUrl:     process.env.BOT_INVITE_URL  ?? "",
  website:       process.env.BOT_WEBSITE     ?? "https://github.com/WokSpec/Chopsticks",
  github:        process.env.BOT_GITHUB      ?? "https://github.com/WokSpec/Chopsticks",

  // Default footer for all embeds. {botname} is replaced at runtime.
  footerText: process.env.BOT_FOOTER ?? "{botname}",

  // Static thumbnail URL (optional). Falls back to bot avatar.
  thumbnailUrl: process.env.BOT_THUMBNAIL_URL ?? null,

  // Default color palette — override per-server via /theme command
  colors: {
    primary: Number(process.env.COLOR_PRIMARY ?? 0x5865F2),
    success: Number(process.env.COLOR_SUCCESS ?? 0x57F287),
    error:   Number(process.env.COLOR_ERROR   ?? 0xED4245),
    warning: Number(process.env.COLOR_WARNING ?? 0xFEE75C),
    info:    Number(process.env.COLOR_INFO    ?? 0x5865F2),
    neutral: Number(process.env.COLOR_NEUTRAL ?? 0x99AAB5),
    premium: Number(process.env.COLOR_PREMIUM ?? 0xFF73FA),
    music:   Number(process.env.COLOR_MUSIC   ?? 0x1DB954),
  },

  // Feature flags — set env var to "false" to disable globally
  features: {
    economy:       (process.env.FEATURE_ECONOMY      ?? "true") === "true",
    music:         (process.env.FEATURE_MUSIC        ?? "true") === "true",
    ai:            (process.env.FEATURE_AI           ?? "true") === "true",
    leveling:      (process.env.FEATURE_LEVELING     ?? "true") === "true",
    voicemaster:   (process.env.FEATURE_VOICE        ?? "true") === "true",
    tickets:       (process.env.FEATURE_TICKETS      ?? "true") === "true",
    moderation:    (process.env.FEATURE_MODERATION   ?? "true") === "true",
    fun:           (process.env.FEATURE_FUN          ?? "true") === "true",
    social:        (process.env.FEATURE_SOCIAL       ?? "true") === "true",
    notifications: (process.env.FEATURE_NOTIFY       ?? "true") === "true",
  },
};

export default Branding;
