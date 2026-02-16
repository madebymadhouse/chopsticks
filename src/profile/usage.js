import { getPool } from "../utils/storage_pg.js";

function clampInt(v, min, max) {
  const n = Math.trunc(Number(v) || 0);
  return Math.max(min, Math.min(max, n));
}

export async function recordUserCommandStat({
  userId,
  command,
  ok = true,
  durationMs = 0,
  source = "slash"
} = {}) {
  const uid = String(userId || "").trim();
  const cmd = String(command || "").trim().toLowerCase();
  if (!uid || !cmd) return false;

  const src = String(source || "slash").toLowerCase() === "prefix" ? "prefix" : "slash";
  const success = Boolean(ok);
  const ms = Math.max(0, Math.trunc(Number(durationMs) || 0));
  const now = Date.now();
  const p = getPool();

  await p.query(
    `INSERT INTO user_command_stats (user_id, command, source, ok, err, total_ms, count, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7)
     ON CONFLICT (user_id, command, source) DO UPDATE SET
       ok = user_command_stats.ok + EXCLUDED.ok,
       err = user_command_stats.err + EXCLUDED.err,
       total_ms = user_command_stats.total_ms + EXCLUDED.total_ms,
       count = user_command_stats.count + 1,
       updated_at = EXCLUDED.updated_at`,
    [uid, cmd, src, success ? 1 : 0, success ? 0 : 1, ms, now]
  );
  return true;
}

export async function getUserCommandUsage(userId, topLimit = 3) {
  const uid = String(userId || "").trim();
  if (!uid) {
    return {
      totals: { runs: 0, ok: 0, err: 0, avgMs: 0 },
      top: [],
      lastAt: null
    };
  }

  const p = getPool();
  const lim = clampInt(topLimit, 1, 10);

  const [totalsRes, topRes, lastRes] = await Promise.all([
    p.query(
      `SELECT
         COALESCE(SUM(ok + err), 0) AS runs,
         COALESCE(SUM(ok), 0) AS ok,
         COALESCE(SUM(err), 0) AS err,
         COALESCE(SUM(total_ms), 0) AS total_ms,
         COALESCE(SUM(count), 0) AS count
       FROM user_command_stats
       WHERE user_id = $1`,
      [uid]
    ),
    p.query(
      `SELECT command, source, (ok + err) AS runs, ok, err, total_ms, count
       FROM user_command_stats
       WHERE user_id = $1
       ORDER BY (ok + err) DESC, updated_at DESC
       LIMIT $2`,
      [uid, lim]
    ),
    p.query(
      `SELECT MAX(updated_at) AS last_at
       FROM user_command_stats
       WHERE user_id = $1`,
      [uid]
    )
  ]);

  const t = totalsRes.rows[0] || {};
  const totalCount = Number(t.count || 0);
  const totals = {
    runs: Number(t.runs || 0),
    ok: Number(t.ok || 0),
    err: Number(t.err || 0),
    avgMs: totalCount > 0 ? Math.round(Number(t.total_ms || 0) / totalCount) : 0
  };

  const top = (topRes.rows || []).map(r => ({
    command: r.command,
    source: r.source,
    runs: Number(r.runs || 0),
    ok: Number(r.ok || 0),
    err: Number(r.err || 0),
    avgMs: Number(r.count || 0) > 0 ? Math.round(Number(r.total_ms || 0) / Number(r.count || 1)) : 0
  }));

  const lastAt = Number(lastRes.rows?.[0]?.last_at || 0) || null;
  return { totals, top, lastAt };
}

export async function getGlobalCommandUsage(limit = 3) {
  const p = getPool();
  const lim = clampInt(limit, 1, 10);

  const res = await p.query(
    `SELECT command, (ok + err) AS runs
     FROM command_stats
     WHERE guild_id = '__global__'
     ORDER BY (ok + err) DESC
     LIMIT $1`,
    [lim]
  );
  const rows = (res.rows || []).map(r => ({
    command: r.command,
    runs: Number(r.runs || 0)
  }));

  if (rows.length > 0) return rows;

  // Fallback for fresh deployments before command_stats has baseline rows.
  const fallback = await p.query(
    `SELECT command, COALESCE(SUM(ok + err), 0) AS runs
     FROM user_command_stats
     GROUP BY command
     ORDER BY runs DESC
     LIMIT $1`,
    [lim]
  );
  return (fallback.rows || []).map(r => ({
    command: r.command,
    runs: Number(r.runs || 0)
  }));
}

export async function getInventorySummary(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return { uniqueItems: 0, totalItems: 0 };
  const p = getPool();
  const res = await p.query(
    `SELECT
       COUNT(*)::bigint AS unique_items,
       COALESCE(SUM(quantity), 0)::bigint AS total_items
     FROM user_inventory
     WHERE user_id = $1`,
    [uid]
  );
  const row = res.rows[0] || {};
  return {
    uniqueItems: Number(row.unique_items || 0),
    totalItems: Number(row.total_items || 0)
  };
}

export async function getRecentEconomyActivity(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return null;
  const p = getPool();
  const res = await p.query(
    `SELECT MAX(timestamp) AS last_tx
     FROM transaction_log
     WHERE from_user = $1 OR to_user = $1`,
    [uid]
  );
  const ts = Number(res.rows?.[0]?.last_tx || 0);
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

