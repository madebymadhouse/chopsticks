import { loadGuildData, saveGuildData } from "./storage.js";
import { isValidAliasName, normalizeAliasName, resolveAliasedCommand } from "../prefix/hardening.js";

export async function getAliases(guildId) {
  const data = await loadGuildData(guildId);
  data.prefix ??= {};
  data.prefix.aliases ??= {};
  return data.prefix.aliases;
}

export async function setAlias(guildId, alias, commandName) {
  const data = await loadGuildData(guildId);
  data.prefix ??= {};
  data.prefix.aliases ??= {};
  const key = normalizeAliasName(alias);
  const target = normalizeAliasName(commandName);
  if (!key || !target) throw new Error("Alias and command are required.");
  if (!isValidAliasName(key)) throw new Error("Alias must be 1-24 chars: letters, numbers, '_' or '-'.");
  const projected = { ...data.prefix.aliases, [key]: target };
  const resolved = resolveAliasedCommand(key, projected, 20);
  if (!resolved.ok && resolved.error === "cycle") {
    throw new Error("Alias would create a cycle.");
  }
  if (!resolved.ok && resolved.error === "depth") {
    throw new Error("Alias chain too deep.");
  }
  data.prefix.aliases[key] = target;
  await saveGuildData(guildId, data);
  return { ok: true, alias: key, commandName: target };
}

export async function clearAlias(guildId, alias) {
  const data = await loadGuildData(guildId);
  const key = normalizeAliasName(alias);
  if (data.prefix?.aliases?.[key]) {
    delete data.prefix.aliases[key];
    await saveGuildData(guildId, data);
  }
  return { ok: true, alias: key };
}
