// src/tools/modcases/escalation.js
// Escalation chain engine — checks if a user should receive an escalated punishment
// based on their warn count in a rolling window.

import { loadGuildData, saveGuildData } from "../../utils/storage.js";
import { countRecentCases } from "./store.js";

/**
 * Default escalation chain — configurable per guild.
 * Each step: { warnCount, action, durationMs }
 */
export function defaultEscalationChain() {
  return [
    { warnCount: 3, action: "mute",  durationMs: 10 * 60 * 1000 }, // 3 warns → 10m mute
    { warnCount: 5, action: "kick",  durationMs: null },            // 5 warns → kick
    { warnCount: 7, action: "ban",   durationMs: null },            // 7 warns → ban
  ];
}

/**
 * Get the escalation config for a guild.
 */
export async function getEscalationConfig(guildId) {
  const gd = await loadGuildData(guildId);
  return gd.modcases?.escalation ?? {
    enabled: false,
    chain: defaultEscalationChain(),
    windowDays: 30,
  };
}

/**
 * Check if the user's warn count triggers an escalation step.
 * Returns the escalation action, or null if no escalation.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<{ action: string, durationMs: number|null } | null>}
 */
export async function checkEscalation(guildId, userId) {
  const config = await getEscalationConfig(guildId);
  if (!config.enabled) return null;

  const windowMs = (config.windowDays ?? 30) * 24 * 60 * 60 * 1000;
  const warnCount = await countRecentCases(guildId, userId, "warn", windowMs);

  // Find the highest triggered step
  const chain = [...(config.chain ?? defaultEscalationChain())].sort((a, b) => b.warnCount - a.warnCount);
  for (const step of chain) {
    if (warnCount >= step.warnCount) {
      return { action: step.action, durationMs: step.durationMs };
    }
  }
  return null;
}

/**
 * Save a custom escalation chain for a guild.
 */
export async function saveEscalationConfig(guildId, patch) {
  const gd = await loadGuildData(guildId);
  gd.modcases ??= { nextId: 1, cases: [] };
  gd.modcases.escalation ??= { enabled: false, chain: defaultEscalationChain(), windowDays: 30 };
  Object.assign(gd.modcases.escalation, patch);
  await saveGuildData(guildId, gd);
  return gd.modcases.escalation;
}
