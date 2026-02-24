// src/utils/theme.js
// Per-server theme resolver.
// Admins use /theme to set colors, footer, persona name, and feature toggles.
// All embed builders should call getTheme(guildId) to get resolved values.
//
// Priority: server override → branding.js → hardcoded default

import { loadGuildData } from "./storage.js";
import { Branding } from "../config/branding.js";

/**
 * Returns the resolved theme for a guild (or defaults if no guild).
 * @param {string|null} guildId
 * @returns {Promise<ThemeConfig>}
 */
export async function getTheme(guildId) {
  let serverTheme = null;
  if (guildId) {
    try {
      const gd = await loadGuildData(guildId);
      serverTheme = gd?.theme ?? null;
    } catch {}
  }

  const st = serverTheme ?? {};
  const bc = Branding.colors;

  return {
    name:    st.name    ?? Branding.name,
    footer:  st.footer  ?? Branding.footerText.replace("{botname}", Branding.name),
    colors: {
      primary: st.colors?.primary ?? bc.primary,
      success: st.colors?.success ?? bc.success,
      error:   st.colors?.error   ?? bc.error,
      warning: st.colors?.warning ?? bc.warning,
      info:    st.colors?.info    ?? bc.info,
      neutral: st.colors?.neutral ?? bc.neutral,
    },
    // Per-guild feature overrides on top of global flags
    features: {
      economy:       st.features?.economy       ?? Branding.features.economy,
      music:         st.features?.music         ?? Branding.features.music,
      ai:            st.features?.ai            ?? Branding.features.ai,
      leveling:      st.features?.leveling      ?? Branding.features.leveling,
      voicemaster:   st.features?.voicemaster   ?? Branding.features.voicemaster,
      tickets:       st.features?.tickets       ?? Branding.features.tickets,
      moderation:    st.features?.moderation    ?? Branding.features.moderation,
      fun:           st.features?.fun           ?? Branding.features.fun,
      social:        st.features?.social        ?? Branding.features.social,
      notifications: st.features?.notifications ?? Branding.features.notifications,
    },
  };
}

/**
 * Synchronous version using a pre-loaded guild data object (no I/O).
 */
export function getThemeSync(gd) {
  const st = gd?.theme ?? {};
  const bc = Branding.colors;
  return {
    name:   st.name   ?? Branding.name,
    footer: st.footer ?? Branding.footerText.replace("{botname}", Branding.name),
    colors: {
      primary: st.colors?.primary ?? bc.primary,
      success: st.colors?.success ?? bc.success,
      error:   st.colors?.error   ?? bc.error,
      warning: st.colors?.warning ?? bc.warning,
      info:    st.colors?.info    ?? bc.info,
      neutral: st.colors?.neutral ?? bc.neutral,
    },
  };
}

function parseHex(value) {
  const s = String(value).replace("#", "").toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(s)) return null;
  return parseInt(s, 16);
}

/**
 * Apply a theme change to guild data. Returns the updated gd object.
 * Does NOT save — caller must call saveGuildData.
 */
export function applyThemeChange(gd, key, value) {
  gd.theme ??= {};
  const theme = gd.theme;

  if (key === "name")   { theme.name = value; return; }
  if (key === "footer") { theme.footer = value; return; }

  if (key.startsWith("color:")) {
    const slot = key.slice(6); // e.g. "primary"
    theme.colors ??= {};
    theme.colors[slot] = parseHex(value);
    return;
  }

  if (key.startsWith("feature:")) {
    const feat = key.slice(8);
    theme.features ??= {};
    theme.features[feat] = Boolean(value);
    return;
  }
}
