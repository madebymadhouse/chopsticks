import { randomUUID } from "node:crypto";
import { PermissionFlagsBits } from "discord.js";
import { getPool } from "../utils/storage_pg.js";
import { logger } from "../utils/logger.js";

function normalizeName(name) {
  const out = String(name || "").trim();
  if (!out) throw new Error("Script name is required.");
  return out.slice(0, 64);
}

function normalizeTriggerType(value) {
  const v = String(value || "command").toLowerCase();
  if (!["command", "schedule", "event"].includes(v)) {
    throw new Error("Invalid trigger type.");
  }
  return v;
}

function normalizeTriggerValue(value) {
  const out = String(value || "").trim();
  return out ? out.slice(0, 128) : null;
}

function normalizeScriptId(value) {
  const id = String(value || "").trim();
  if (!id) throw new Error("script_id is required.");
  return id.slice(0, 128);
}

export async function upsertGuildScript({
  guildId,
  name,
  triggerType,
  triggerValue,
  definition,
  isActive = true,
  actorUserId,
  changeNote = ""
}) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  if (!gid) throw new Error("guild_id is required.");

  const actor = String(actorUserId || "").trim();
  if (!actor) throw new Error("actor_user_id is required.");

  const scriptName = normalizeName(name);
  const trigType = normalizeTriggerType(triggerType);
  const trigValue = normalizeTriggerValue(triggerValue);
  const note = String(changeNote || "").trim().slice(0, 300);
  const active = Boolean(isActive);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT script_id, current_version
       FROM guild_scripts
       WHERE guild_id = $1 AND name = $2
       FOR UPDATE`,
      [gid, scriptName]
    );

    if (existing.rowCount === 0) {
      const scriptId = `scr_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await client.query(
        `INSERT INTO guild_scripts
          (guild_id, script_id, name, trigger_type, trigger_value, definition, is_active, current_version, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$8)`,
        [gid, scriptId, scriptName, trigType, trigValue, definition, active, actor]
      );
      await client.query(
        `INSERT INTO guild_script_versions
          (guild_id, script_id, version, definition, created_by, change_note)
         VALUES ($1,$2,1,$3,$4,$5)`,
        [gid, scriptId, definition, actor, note]
      );
      await client.query(
        `INSERT INTO guild_script_audit
          (guild_id, script_id, actor_user_id, action, details)
         VALUES ($1,$2,$3,'create',$4::jsonb)`,
        [gid, scriptId, actor, JSON.stringify({ name: scriptName, triggerType: trigType, triggerValue: trigValue, active, note })]
      );

      await client.query("COMMIT");
      return { mode: "created", scriptId, version: 1, name: scriptName };
    }

    const scriptId = String(existing.rows[0].script_id);
    const nextVersion = Number(existing.rows[0].current_version || 1) + 1;

    await client.query(
      `UPDATE guild_scripts
       SET trigger_type = $3,
           trigger_value = $4,
           definition = $5,
           is_active = $6,
           current_version = $7,
           updated_by = $8,
           updated_at = NOW()
       WHERE guild_id = $1 AND script_id = $2`,
      [gid, scriptId, trigType, trigValue, definition, active, nextVersion, actor]
    );
    await client.query(
      `INSERT INTO guild_script_versions
        (guild_id, script_id, version, definition, created_by, change_note)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [gid, scriptId, nextVersion, definition, actor, note]
    );
    await client.query(
      `INSERT INTO guild_script_audit
        (guild_id, script_id, actor_user_id, action, details)
       VALUES ($1,$2,$3,'update',$4::jsonb)`,
      [gid, scriptId, actor, JSON.stringify({ name: scriptName, triggerType: trigType, triggerValue: trigValue, active, version: nextVersion, note })]
    );

    await client.query("COMMIT");
    return { mode: "updated", scriptId, version: nextVersion, name: scriptName };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listGuildScripts(guildId, { activeOnly = false, limit = 25 } = {}) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  if (!gid) throw new Error("guild_id is required.");
  const lim = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 25)));

  const where = activeOnly ? "WHERE guild_id = $1 AND is_active = true" : "WHERE guild_id = $1";
  const result = await pool.query(
    `SELECT script_id, name, trigger_type, trigger_value, is_active, current_version, created_by, updated_by, created_at, updated_at
     FROM guild_scripts
     ${where}
     ORDER BY updated_at DESC
     LIMIT $2`,
    [gid, lim]
  );
  return result.rows;
}

export async function getGuildScript(guildId, scriptId) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  const sid = normalizeScriptId(scriptId);
  const result = await pool.query(
    `SELECT script_id, name, trigger_type, trigger_value, definition, is_active, current_version, created_by, updated_by, created_at, updated_at
     FROM guild_scripts
     WHERE guild_id = $1 AND script_id = $2`,
    [gid, sid]
  );
  return result.rows[0] || null;
}

export async function getGuildScriptByName(guildId, name) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  const scriptName = normalizeName(name);
  const result = await pool.query(
    `SELECT script_id, name, trigger_type, trigger_value, definition, is_active, current_version, created_by, updated_by, created_at, updated_at
     FROM guild_scripts
     WHERE guild_id = $1 AND name = $2`,
    [gid, scriptName]
  );
  return result.rows[0] || null;
}

export async function insertScriptAudit({
  guildId,
  scriptId,
  actorUserId,
  action,
  details = {}
}) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  const sid = normalizeScriptId(scriptId);
  const actor = String(actorUserId || "").trim();
  const act = String(action || "").trim().slice(0, 32);
  if (!gid || !sid || !actor || !act) return;
  await pool.query(
    `INSERT INTO guild_script_audit (guild_id, script_id, actor_user_id, action, details)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [gid, sid, actor, act, JSON.stringify(details || {})]
  );
}

export async function listScriptAudit(guildId, scriptId, limit = 20) {
  const pool = getPool();
  const gid = String(guildId || "").trim();
  const sid = normalizeScriptId(scriptId);
  const lim = Math.max(1, Math.min(100, Math.trunc(Number(limit) || 20)));
  const result = await pool.query(
    `SELECT id, actor_user_id, action, details, created_at
     FROM guild_script_audit
     WHERE guild_id = $1 AND script_id = $2
     ORDER BY id DESC
     LIMIT $3`,
    [gid, sid, lim]
  );
  return result.rows;
}

export async function checkScriptRunPermission(script, member) {
  const mode = String(script?.definition?.permissions?.mode || "admin");
  if (mode === "everyone") return true;
  if (!member) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;

  const roleIds = Array.isArray(script?.definition?.permissions?.roleIds)
    ? script.definition.permissions.roleIds.map(String)
    : [];
  if (!roleIds.length) return false;
  const memberRoles = member.roles?.cache;
  if (!memberRoles) return false;
  return roleIds.some(roleId => memberRoles.has(roleId));
}

export function logScriptingError(context, error) {
  logger.error("[scripting] operation failed", {
    ...context,
    error: error?.message ?? String(error)
  });
}
