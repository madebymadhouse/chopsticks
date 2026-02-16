import { getPool } from "../utils/storage_pg.js";

const DEFAULT_PRIVACY = Object.freeze({
  showProgress: true,
  showEconomy: true,
  showInventory: true,
  showUsage: true,
  showActivity: true
});

function normalizeRow(row = {}) {
  return {
    showProgress: row.show_progress !== false,
    showEconomy: row.show_economy !== false,
    showInventory: row.show_inventory !== false,
    showUsage: row.show_usage !== false,
    showActivity: row.show_activity !== false
  };
}

function normalizePatch(patch = {}) {
  const out = {};
  if (typeof patch.showProgress === "boolean") out.showProgress = patch.showProgress;
  if (typeof patch.showEconomy === "boolean") out.showEconomy = patch.showEconomy;
  if (typeof patch.showInventory === "boolean") out.showInventory = patch.showInventory;
  if (typeof patch.showUsage === "boolean") out.showUsage = patch.showUsage;
  if (typeof patch.showActivity === "boolean") out.showActivity = patch.showActivity;
  return out;
}

export function defaultPrivacy() {
  return { ...DEFAULT_PRIVACY };
}

export function applyPrivacyPreset(current, preset) {
  const base = { ...DEFAULT_PRIVACY, ...(current || {}) };
  const p = String(preset || "").toLowerCase();

  if (p === "show_all") {
    return { ...DEFAULT_PRIVACY };
  }
  if (p === "hide_sensitive") {
    return {
      ...base,
      showProgress: true,
      showEconomy: false,
      showInventory: false,
      showUsage: false,
      showActivity: false
    };
  }
  return base;
}

export async function getUserProfilePrivacy(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return defaultPrivacy();

  const p = getPool();
  const now = Date.now();

  const res = await p.query(
    `INSERT INTO user_profile_privacy (
       user_id, show_progress, show_economy, show_inventory, show_usage, show_activity, updated_at
     )
     VALUES ($1, TRUE, TRUE, TRUE, TRUE, TRUE, $2)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING show_progress, show_economy, show_inventory, show_usage, show_activity`,
    [uid, now]
  );

  if (res.rows.length) return normalizeRow(res.rows[0]);

  const read = await p.query(
    `SELECT show_progress, show_economy, show_inventory, show_usage, show_activity
     FROM user_profile_privacy
     WHERE user_id = $1`,
    [uid]
  );
  if (!read.rows.length) return defaultPrivacy();
  return normalizeRow(read.rows[0]);
}

export async function updateUserProfilePrivacy(userId, { preset = null, patch = {} } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return defaultPrivacy();

  const current = await getUserProfilePrivacy(uid);
  const mergedPreset = applyPrivacyPreset(current, preset);
  const merged = { ...mergedPreset, ...normalizePatch(patch) };
  const now = Date.now();
  const p = getPool();

  const res = await p.query(
    `INSERT INTO user_profile_privacy (
       user_id, show_progress, show_economy, show_inventory, show_usage, show_activity, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       show_progress = EXCLUDED.show_progress,
       show_economy = EXCLUDED.show_economy,
       show_inventory = EXCLUDED.show_inventory,
       show_usage = EXCLUDED.show_usage,
       show_activity = EXCLUDED.show_activity,
       updated_at = EXCLUDED.updated_at
     RETURNING show_progress, show_economy, show_inventory, show_usage, show_activity`,
    [
      uid,
      merged.showProgress,
      merged.showEconomy,
      merged.showInventory,
      merged.showUsage,
      merged.showActivity,
      now
    ]
  );

  return normalizeRow(res.rows[0] || merged);
}

