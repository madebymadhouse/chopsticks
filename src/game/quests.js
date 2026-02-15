// src/game/quests.js
// Daily quests: generate + track progress + claim rewards.

import { getPool } from "../utils/storage_pg.js";
import { getGameProfile } from "./profile.js";
import { levelFromXp } from "./progression.js";

function utcDayKey(now = Date.now()) {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clampInt(n, min, max) {
  const v = Math.trunc(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

function questPoolForLevel(level) {
  const L = clampInt(level, 1, 999);
  const scale = (base) => clampInt(Math.round(base * (1 + (Math.min(40, L) - 1) / 40)), 1, 999999);

  return [
    {
      id: "work_runs",
      title: "Clock In",
      description: "Complete work runs.",
      target: scale(2),
      reward: { credits: scale(450), xp: scale(120) }
    },
    {
      id: "gather_runs",
      title: "Data Sweep",
      description: "Complete gather runs.",
      target: scale(3),
      reward: { credits: scale(320), xp: scale(140) }
    },
    {
      id: "fight_wins",
      title: "Clear Encounters",
      description: "Win fights.",
      target: clampInt(Math.max(1, Math.round(1 + L / 10)), 1, 10),
      reward: { credits: scale(520), xp: scale(180) }
    },
    {
      id: "sell_items",
      title: "Liquidate Loot",
      description: "Sell collectibles via /use.",
      target: scale(4),
      reward: { credits: scale(260), xp: scale(110), item: "luck_charm" }
    },
    {
      id: "shop_purchases",
      title: "Stock Up",
      description: "Buy items from the shop.",
      target: scale(2),
      reward: { credits: scale(200), xp: scale(90), item: "energy_drink" }
    }
  ];
}

function pickN(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function normalizeRow(row) {
  const quests = Array.isArray(row?.quests) ? row.quests : [];
  const progress = row?.progress && typeof row.progress === "object" ? row.progress : {};
  const claimed = row?.claimed && typeof row.claimed === "object" ? row.claimed : {};
  return { ...row, quests, progress, claimed };
}

export async function getDailyQuests(userId) {
  const p = getPool();
  const now = Date.now();
  const day = utcDayKey(now);

  const res = await p.query(
    `SELECT user_id, day, quests, progress, claimed, created_at, updated_at
     FROM user_daily_quests
     WHERE user_id = $1 AND day = $2`,
    [userId, day]
  );

  if (res.rows.length) return normalizeRow(res.rows[0]);

  const profile = await getGameProfile(userId);
  const pool = questPoolForLevel(profile.level);
  const quests = pickN(pool, 3);
  const progress = {};
  const claimed = {};
  for (const q of quests) {
    progress[q.id] = 0;
    claimed[q.id] = false;
  }

  await p.query(
    `INSERT INTO user_daily_quests (user_id, day, quests, progress, claimed, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)`,
    [userId, day, JSON.stringify(quests), JSON.stringify(progress), JSON.stringify(claimed), now]
  );

  return { user_id: userId, day, quests, progress, claimed, created_at: now, updated_at: now };
}

export async function recordQuestEvent(userId, eventId, amount = 1) {
  const p = getPool();
  const now = Date.now();
  const day = utcDayKey(now);
  const inc = clampInt(amount, 1, 1000000);

  // Ensure the row exists (outside the lock/tx).
  try { await getDailyQuests(userId); } catch {}

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const rowRes = await client.query(
      `SELECT user_id, day, quests, progress, claimed, created_at, updated_at
       FROM user_daily_quests
       WHERE user_id = $1 AND day = $2
       FOR UPDATE`,
      [userId, day]
    );
    const row = rowRes.rows.length ? normalizeRow(rowRes.rows[0]) : null;
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false, error: "missing-row" };
    }

    const next = { ...(row.progress || {}) };
    if (Object.prototype.hasOwnProperty.call(next, eventId)) {
      next[eventId] = clampInt(Number(next[eventId] || 0) + inc, 0, 999999999);
      await client.query(
        `UPDATE user_daily_quests SET progress = $1, updated_at = $2 WHERE user_id = $3 AND day = $4`,
        [JSON.stringify(next), now, userId, day]
      );
    }
    await client.query("COMMIT");
    return { ok: true };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    // Quest tracking must not break core commands.
    return { ok: false, error: err?.message || String(err) };
  } finally {
    client.release();
  }
}

export async function claimQuestRewards(userId) {
  const p = getPool();
  const now = Date.now();
  const day = utcDayKey(now);

  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const rowRes = await client.query(
      `SELECT user_id, day, quests, progress, claimed, created_at, updated_at
       FROM user_daily_quests
       WHERE user_id = $1 AND day = $2
       FOR UPDATE`,
      [userId, day]
    );
    if (!rowRes.rows.length) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "none" };
    }
    const row = normalizeRow(rowRes.rows[0]);
    const progress = row.progress || {};
    const claimed = row.claimed || {};

    const completed = [];
    for (const q of row.quests || []) {
      const cur = Number(progress[q.id] || 0);
      const done = cur >= Number(q.target || 0);
      const already = Boolean(claimed[q.id]);
      if (done && !already) completed.push(q);
    }

    if (!completed.length) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "nothing" };
    }

    let totalCredits = 0;
    let totalXp = 0;
    const items = [];
    for (const q of completed) {
      totalCredits += Math.max(0, Math.trunc(Number(q.reward?.credits) || 0));
      totalXp += Math.max(0, Math.trunc(Number(q.reward?.xp) || 0));
      if (q.reward?.item) items.push(String(q.reward.item));
    }

    // Apply rewards atomically with the claim.
    if (totalCredits > 0) {
      await client.query(
        `INSERT INTO user_wallets (user_id, balance, bank, bank_capacity, total_earned, total_spent, created_at, updated_at)
         VALUES ($1, $2, 0, 10000, $2, 0, $3, $3)
         ON CONFLICT (user_id) DO UPDATE
         SET balance = user_wallets.balance + $2,
             total_earned = user_wallets.total_earned + $2,
             updated_at = $3`,
        [userId, totalCredits, now]
      );
      await client.query(
        `INSERT INTO transaction_log (from_user, to_user, amount, reason, metadata, timestamp)
         VALUES (NULL, $1, $2, $3, $4, $5)`,
        [userId, totalCredits, "quests", JSON.stringify({ day, quests: completed.map(q => q.id) }), now]
      );
    }

    let xpRes = null;
    if (totalXp > 0) {
      const profRes = await client.query(
        `INSERT INTO user_game_profiles (user_id, xp, level, created_at, updated_at)
         VALUES ($1, 0, 1, $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET updated_at = $2
         RETURNING xp, level`,
        [userId, now]
      );
      const beforeXp = Math.max(0, Math.trunc(Number(profRes.rows[0]?.xp) || 0));
      const beforeLevel = Math.max(1, Math.trunc(Number(profRes.rows[0]?.level) || 1));
      const nextXp = beforeXp + totalXp;
      const nextLevel = levelFromXp(nextXp);
      await client.query(
        `UPDATE user_game_profiles SET xp = $1, level = $2, updated_at = $3 WHERE user_id = $4`,
        [nextXp, nextLevel, now, userId]
      );
      xpRes = {
        applied: totalXp,
        leveledUp: nextLevel > beforeLevel,
        fromLevel: beforeLevel,
        toLevel: nextLevel
      };
    }

    for (const itemId of items) {
      await client.query(
        `INSERT INTO user_inventory (user_id, item_id, quantity, metadata, acquired_at)
         VALUES ($1, $2, 1, '{}'::jsonb, $3)
         ON CONFLICT (user_id, item_id) DO UPDATE SET quantity = user_inventory.quantity + 1`,
        [userId, itemId, now]
      );
    }

    const nextClaimed = { ...claimed };
    for (const q of completed) nextClaimed[q.id] = true;
    await client.query(
      `UPDATE user_daily_quests SET claimed = $1, updated_at = $2 WHERE user_id = $3 AND day = $4`,
      [JSON.stringify(nextClaimed), now, userId, day]
    );

    await client.query("COMMIT");
    return { ok: true, completed, totalCredits, totalXp, xpRes, items };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}
