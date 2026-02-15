import { clampIntensity } from "./variants.js";
import { randomFunFromRuntime } from "./runtime.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";

export const DEFAULT_GUILD_FUN_CONFIG = {
  enabled: true,
  mode: "clean",
  intensity: 3,
  features: {
    welcome: true,
    giveaway: true,
    daily: true,
    work: true
  }
};

function toBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined) return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return fallback;
}

export function normalizeGuildFunConfig(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const features = src.features && typeof src.features === "object" ? src.features : {};
  const modeRaw = String(src.mode || DEFAULT_GUILD_FUN_CONFIG.mode).trim().toLowerCase();
  const mode = ["off", "clean", "creative"].includes(modeRaw) ? modeRaw : DEFAULT_GUILD_FUN_CONFIG.mode;
  return {
    enabled: toBool(src.enabled, DEFAULT_GUILD_FUN_CONFIG.enabled),
    mode,
    intensity: clampIntensity(src.intensity ?? DEFAULT_GUILD_FUN_CONFIG.intensity),
    features: {
      welcome: toBool(features.welcome, DEFAULT_GUILD_FUN_CONFIG.features.welcome),
      giveaway: toBool(features.giveaway, DEFAULT_GUILD_FUN_CONFIG.features.giveaway),
      daily: toBool(features.daily, DEFAULT_GUILD_FUN_CONFIG.features.daily),
      work: toBool(features.work, DEFAULT_GUILD_FUN_CONFIG.features.work)
    }
  };
}

export function formatGuildFunConfig(config) {
  const out = normalizeGuildFunConfig(config);
  return [
    `enabled=${out.enabled}`,
    `mode=${out.mode}`,
    `intensity=${out.intensity}`,
    `welcome=${out.features.welcome}`,
    `giveaway=${out.features.giveaway}`,
    `daily=${out.features.daily}`,
    `work=${out.features.work}`
  ].join(" | ");
}

export async function getGuildFunConfig(guildId) {
  const data = await loadGuildData(guildId);
  const cfg = normalizeGuildFunConfig(data.fun);
  return { ok: true, config: cfg, data };
}

export async function setGuildFunConfig(guildId, patch = {}) {
  const data = await loadGuildData(guildId);
  const current = normalizeGuildFunConfig(data.fun);

  const next = normalizeGuildFunConfig({
    ...current,
    ...patch,
    features: {
      ...current.features,
      ...(patch.features && typeof patch.features === "object" ? patch.features : {})
    }
  });

  data.fun = next;
  await saveGuildData(guildId, data);
  return { ok: true, config: next };
}

function truncate(text, max = 220) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  if (max <= 3) return s.slice(0, Math.max(0, max));
  return `${s.slice(0, Math.max(0, max - 3))}...`;
}

function buildCleanLine({ feature, context = {} }) {
  if (feature === "welcome") {
    return "Welcome in. Start with /help or open /commands ui.";
  }

  if (feature === "giveaway") {
    const phase = String(context.phase || "").toLowerCase();
    if (phase === "end") {
      const entrants = Number.isFinite(Number(context.entrants)) ? Math.max(0, Math.trunc(Number(context.entrants))) : null;
      const winnerCount = Number.isFinite(Number(context.winnerCount)) ? Math.max(0, Math.trunc(Number(context.winnerCount))) : null;
      const parts = [];
      if (entrants !== null) parts.push(`Entrants: ${entrants}`);
      if (winnerCount !== null) parts.push(`Winners: ${winnerCount}`);
      if (parts.length) return parts.join(" | ");
      return "Giveaway draw complete.";
    }
    return null;
  }

  return null;
}

export async function maybeBuildGuildFunLine({
  guildId,
  feature,
  actorTag,
  target,
  intensity,
  maxLength = 220,
  context = {}
}) {
  if (!guildId || !feature) return null;
  try {
    const data = await loadGuildData(guildId);
    const cfg = normalizeGuildFunConfig(data.fun);
    if (!cfg.enabled) return null;
    if (!cfg.features?.[feature]) return null;
    if (cfg.mode === "off") return null;

    if (cfg.mode === "clean") {
      const line = buildCleanLine({ feature, context });
      return line ? truncate(line, maxLength) : null;
    }

    const out = await randomFunFromRuntime({
      actorTag: actorTag || "chopsticks",
      target: target || "crew",
      intensity: clampIntensity(intensity ?? cfg.intensity)
    });

    if (!out?.ok || !out?.text) return null;
    return truncate(out.text, maxLength);
  } catch {
    return null;
  }
}
