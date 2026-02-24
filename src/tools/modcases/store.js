// src/tools/modcases/store.js
// Mod case storage layer — cases stored in guildData.modcases

import { loadGuildData, saveGuildData } from "../../utils/storage.js";

export const CASE_TYPES = ["warn", "mute", "kick", "ban", "unban", "note"];

/**
 * Create a new mod case.
 * @returns {object} The created case record
 */
export async function createCase(guildId, { type, userId, modId, reason = "No reason provided", duration = null }) {
  const gd = await loadGuildData(guildId);
  gd.modcases ??= { nextId: 1, cases: [] };
  gd.modcases.nextId ??= 1;
  gd.modcases.cases ??= [];

  const caseRecord = {
    id: gd.modcases.nextId++,
    type,
    userId,
    modId,
    reason,
    duration,       // ms or null
    createdAt: Date.now(),
    active: true,
    pardoned: false,
    notes: [],
  };

  gd.modcases.cases.push(caseRecord);
  await saveGuildData(guildId, gd);
  return caseRecord;
}

/**
 * Get a single case by ID.
 */
export async function getCase(guildId, caseId) {
  const gd = await loadGuildData(guildId);
  return (gd.modcases?.cases ?? []).find(c => c.id === caseId) ?? null;
}

/**
 * List cases for a guild, optionally filtered by userId.
 * Returns newest first.
 */
export async function listCases(guildId, { userId = null, limit = 20 } = {}) {
  const gd = await loadGuildData(guildId);
  let cases = (gd.modcases?.cases ?? []).slice().reverse();
  if (userId) cases = cases.filter(c => c.userId === userId);
  return cases.slice(0, limit);
}

/**
 * Pardon a case — marks it inactive.
 */
export async function pardonCase(guildId, caseId, modId) {
  const gd = await loadGuildData(guildId);
  const c = (gd.modcases?.cases ?? []).find(c => c.id === caseId);
  if (!c) return null;
  c.pardoned = true;
  c.active = false;
  c.pardonedBy = modId;
  c.pardonedAt = Date.now();
  await saveGuildData(guildId, gd);
  return c;
}

/**
 * Add a note to an existing case.
 */
export async function addCaseNote(guildId, caseId, modId, text) {
  const gd = await loadGuildData(guildId);
  const c = (gd.modcases?.cases ?? []).find(c => c.id === caseId);
  if (!c) return null;
  c.notes ??= [];
  c.notes.push({ modId, text, at: Date.now() });
  await saveGuildData(guildId, gd);
  return c;
}

/**
 * Count active (unpardoned) cases of a specific type for a user in the past windowMs.
 */
export async function countRecentCases(guildId, userId, type, windowMs) {
  const gd = await loadGuildData(guildId);
  const since = Date.now() - windowMs;
  return (gd.modcases?.cases ?? []).filter(
    c => c.userId === userId && c.type === type && c.createdAt >= since && !c.pardoned
  ).length;
}
