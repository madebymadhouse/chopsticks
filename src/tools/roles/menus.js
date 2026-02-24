// src/tools/roles/menus.js
// Role menu CRUD — stored in guildData.roleMenus

import { loadGuildData, saveGuildData } from "../../utils/storage.js";

/**
 * Create a new role menu.
 */
export async function createRoleMenu(guildId, { title, description, menuType = "button", exclusive = false }) {
  const gd = await loadGuildData(guildId);
  gd.roleMenus ??= { nextId: 1, menus: [] };
  gd.roleMenus.nextId ??= 1;

  const menu = {
    id: gd.roleMenus.nextId++,
    title: title ?? "Role Menu",
    description: description ?? null,
    menuType,      // "button" | "select"
    exclusive,     // if true, only one role from this menu per user
    options: [],   // { roleId, label, emoji, description, style }
    messageId: null,
    channelId: null,
    createdAt: Date.now(),
  };

  gd.roleMenus.menus.push(menu);
  await saveGuildData(guildId, gd);
  return menu;
}

/**
 * Add a role option to a menu.
 */
export async function addRoleOption(guildId, menuId, { roleId, label, emoji = null, description = null, style = "Secondary" }) {
  const gd = await loadGuildData(guildId);
  const menu = (gd.roleMenus?.menus ?? []).find(m => m.id === menuId);
  if (!menu) return null;
  if (menu.options.some(o => o.roleId === roleId)) return { error: "Role already in this menu." };
  if (menu.options.length >= 25) return { error: "Maximum 25 options per menu." };

  menu.options.push({ roleId, label, emoji, description, style });
  await saveGuildData(guildId, gd);
  return menu;
}

/**
 * Remove a role option from a menu.
 */
export async function removeRoleOption(guildId, menuId, roleId) {
  const gd = await loadGuildData(guildId);
  const menu = (gd.roleMenus?.menus ?? []).find(m => m.id === menuId);
  if (!menu) return null;
  menu.options = menu.options.filter(o => o.roleId !== roleId);
  await saveGuildData(guildId, gd);
  return menu;
}

/**
 * Get a menu by ID.
 */
export async function getRoleMenu(guildId, menuId) {
  const gd = await loadGuildData(guildId);
  return (gd.roleMenus?.menus ?? []).find(m => m.id === menuId) ?? null;
}

/**
 * List all menus for a guild.
 */
export async function listRoleMenus(guildId) {
  const gd = await loadGuildData(guildId);
  return gd.roleMenus?.menus ?? [];
}

/**
 * Delete a menu.
 */
export async function deleteRoleMenu(guildId, menuId) {
  const gd = await loadGuildData(guildId);
  if (!gd.roleMenus) return false;
  const before = gd.roleMenus.menus.length;
  gd.roleMenus.menus = gd.roleMenus.menus.filter(m => m.id !== menuId);
  if (gd.roleMenus.menus.length === before) return false;
  await saveGuildData(guildId, gd);
  return true;
}

/**
 * Record the message ID after publishing.
 */
export async function setRoleMenuMessage(guildId, menuId, messageId, channelId) {
  const gd = await loadGuildData(guildId);
  const menu = (gd.roleMenus?.menus ?? []).find(m => m.id === menuId);
  if (!menu) return null;
  menu.messageId = messageId;
  menu.channelId = channelId;
  await saveGuildData(guildId, gd);
  return menu;
}

/**
 * Find the menu that owns a given message ID (for interaction dispatch).
 */
export async function findMenuByMessage(guildId, messageId) {
  const gd = await loadGuildData(guildId);
  return (gd.roleMenus?.menus ?? []).find(m => m.messageId === messageId) ?? null;
}

// ── Temp roles ────────────────────────────────────────────────────────────────

/**
 * Add a temp role record.
 */
export async function addTempRole(guildId, userId, roleId, expiresAt) {
  const gd = await loadGuildData(guildId);
  gd.tempRoles ??= [];
  // Remove any existing record for this user+role
  gd.tempRoles = gd.tempRoles.filter(r => !(r.userId === userId && r.roleId === roleId && r.guildId === guildId));
  gd.tempRoles.push({ guildId, userId, roleId, expiresAt });
  await saveGuildData(guildId, gd);
}

/**
 * Remove a temp role record.
 */
export async function removeTempRole(guildId, userId, roleId) {
  const gd = await loadGuildData(guildId);
  if (!gd.tempRoles) return;
  gd.tempRoles = gd.tempRoles.filter(r => !(r.userId === userId && r.roleId === roleId));
  await saveGuildData(guildId, gd);
}

/**
 * Get all expired temp roles for a guild.
 */
export async function getExpiredTempRoles(guildId) {
  const gd = await loadGuildData(guildId);
  const now = Date.now();
  return (gd.tempRoles ?? []).filter(r => r.expiresAt <= now);
}
