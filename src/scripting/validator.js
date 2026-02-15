import {
  SCRIPT_LIMITS,
  SCRIPT_SCHEMA_VERSION,
  SCRIPT_TRIGGER_TYPES,
  defaultScriptDefinition
} from "./schema.js";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function boundedText(value, max, fallback = "") {
  const s = String(value ?? "").trim();
  if (!s) return fallback;
  return s.slice(0, max);
}

function ensureSafeKeys(value, path = "root") {
  if (!isObject(value) && !Array.isArray(value)) return;

  const unsafe = new Set(["__proto__", "constructor", "prototype"]);
  if (Array.isArray(value)) {
    value.forEach((entry, i) => ensureSafeKeys(entry, `${path}[${i}]`));
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    if (unsafe.has(key) || key.startsWith("$")) {
      throw new Error(`Unsafe key in script DSL at ${path}.${key}`);
    }
    ensureSafeKeys(entry, `${path}.${key}`);
  }
}

function normalizeTrigger(raw) {
  const trigger = isObject(raw) ? raw : {};
  const typeRaw = String(trigger.type || "command").toLowerCase();
  if (!SCRIPT_TRIGGER_TYPES.has(typeRaw)) {
    throw new Error("trigger.type must be one of: command, schedule, event");
  }
  const value = boundedText(trigger.value, SCRIPT_LIMITS.triggerValue, "");
  return { type: typeRaw, value: value || null };
}

function normalizePermissions(raw) {
  const p = isObject(raw) ? raw : {};
  const modeRaw = String(p.mode || "admin").toLowerCase();
  const mode = modeRaw === "everyone" ? "everyone" : "admin";
  const roleIds = Array.isArray(p.roleIds)
    ? p.roleIds.map(v => String(v || "").trim()).filter(Boolean).slice(0, SCRIPT_LIMITS.roles)
    : [];
  return { mode, roleIds };
}

function normalizeEmbeds(raw) {
  const arr = Array.isArray(raw) ? raw.slice(0, SCRIPT_LIMITS.embeds) : [];
  return arr
    .filter(isObject)
    .map(item => {
      const fieldsRaw = Array.isArray(item.fields) ? item.fields.slice(0, SCRIPT_LIMITS.embedFields) : [];
      const fields = fieldsRaw
        .filter(isObject)
        .map(f => ({
          name: boundedText(f.name, SCRIPT_LIMITS.embedFieldName, ""),
          value: boundedText(f.value, SCRIPT_LIMITS.embedFieldValue, ""),
          inline: Boolean(f.inline)
        }))
        .filter(f => f.name && f.value);

      const out = {
        title: boundedText(item.title, SCRIPT_LIMITS.embedTitle, ""),
        description: boundedText(item.description, SCRIPT_LIMITS.embedDescription, ""),
        color: Number.isFinite(Number(item.color)) ? Math.max(0, Math.min(0xffffff, Math.trunc(Number(item.color)))) : null,
        fields
      };

      if (!out.title && !out.description && fields.length === 0) return null;
      return out;
    })
    .filter(Boolean);
}

function normalizeButtons(raw) {
  const arr = Array.isArray(raw) ? raw.slice(0, SCRIPT_LIMITS.buttons) : [];
  const out = [];
  for (const item of arr) {
    if (!isObject(item)) continue;
    const label = boundedText(item.label, SCRIPT_LIMITS.buttonLabel, "");
    const url = boundedText(item.url, 512, "");
    if (!label || !url) continue;
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("button.url must start with http:// or https://");
    }
    out.push({ style: "link", label, url });
  }
  return out;
}

function normalizeMessage(raw) {
  const msg = isObject(raw) ? raw : {};
  const content = boundedText(msg.content, SCRIPT_LIMITS.content, "");
  const embeds = normalizeEmbeds(msg.embeds);
  const buttons = normalizeButtons(msg.buttons);
  if (!content && embeds.length === 0) {
    throw new Error("message requires content or at least one embed");
  }
  return { content, embeds, buttons };
}

function normalizeVariables(raw) {
  if (!isObject(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const safeKey = String(key || "").trim();
    if (!safeKey || !/^[a-zA-Z0-9_.-]+$/.test(safeKey)) {
      throw new Error(`Invalid variable key: ${key}`);
    }
    out[safeKey] = boundedText(value, 200, "");
  }
  return out;
}

export function validateScriptDefinition(input) {
  const base = defaultScriptDefinition();
  const raw = isObject(input) ? input : {};

  ensureSafeKeys(raw);

  const out = {
    version: SCRIPT_SCHEMA_VERSION,
    trigger: normalizeTrigger(raw.trigger ?? base.trigger),
    permissions: normalizePermissions(raw.permissions ?? base.permissions),
    message: normalizeMessage(raw.message ?? base.message),
    variables: normalizeVariables(raw.variables ?? base.variables)
  };

  return out;
}

