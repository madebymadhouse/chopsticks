// src/tools/customcmd/store.js
// CRUD for custom commands stored in guild data.

import { loadGuildData, saveGuildData } from "../../utils/storage.js";

function ensureStore(gd) {
  gd.customCmds ??= { cmds: {} };
  return gd.customCmds;
}

/**
 * Create or overwrite a custom command.
 */
export async function setCustomCmd(guildId, name, config) {
  const gd = await loadGuildData(guildId);
  const store = ensureStore(gd);
  store.cmds[name.toLowerCase()] = {
    name: name.toLowerCase(),
    response: config.response ?? "",
    embedTitle: config.embedTitle ?? null,
    embedColor: config.embedColor ?? null,
    asEmbed: config.asEmbed ?? false,
    dmUser: config.dmUser ?? false,
    deleteInput: config.deleteInput ?? false,
    requiredRoleId: config.requiredRoleId ?? null,
    allowedChannelId: config.allowedChannelId ?? null,
    enabled: true,
    uses: 0,
    createdBy: config.createdBy ?? null,
    createdAt: Date.now(),
  };
  await saveGuildData(guildId, gd);
}

export async function deleteCustomCmd(guildId, name) {
  const gd = await loadGuildData(guildId);
  const store = ensureStore(gd);
  delete store.cmds[name.toLowerCase()];
  await saveGuildData(guildId, gd);
}

export async function getCustomCmd(guildId, name) {
  const gd = await loadGuildData(guildId);
  return gd.customCmds?.cmds?.[name.toLowerCase()] ?? null;
}

export async function listCustomCmds(guildId) {
  const gd = await loadGuildData(guildId);
  return Object.values(gd.customCmds?.cmds ?? {});
}

export async function incrementUses(guildId, name) {
  const gd = await loadGuildData(guildId);
  const cmd = gd.customCmds?.cmds?.[name.toLowerCase()];
  if (cmd) {
    cmd.uses = (cmd.uses ?? 0) + 1;
    await saveGuildData(guildId, gd);
  }
}
