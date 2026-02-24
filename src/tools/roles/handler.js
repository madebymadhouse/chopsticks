// src/tools/roles/handler.js
// Handles button/select menu interactions for role menus.

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
} from "discord.js";
import { findMenuByMessage, getRoleMenu } from "./menus.js";

export const ROLE_MENU_BUTTON_PREFIX = "chopsticks:rolemenu:btn:";
export const ROLE_MENU_SELECT_ID = "chopsticks:rolemenu:select:";

/**
 * Build the components for a role menu message.
 */
export function buildRoleMenuComponents(menu) {
  if (menu.menuType === "select") {
    const options = menu.options.map(o =>
      new StringSelectMenuOptionBuilder()
        .setLabel(o.label)
        .setValue(o.roleId)
        .setDescription(o.description ?? "")
        .setEmoji(o.emoji ?? undefined)
    );
    const select = new StringSelectMenuBuilder()
      .setCustomId(`${ROLE_MENU_SELECT_ID}${menu.id}`)
      .setPlaceholder("Select a role…")
      .addOptions(options);
    if (!menu.exclusive) select.setMaxValues(Math.min(menu.options.length, 25));
    return [new ActionRowBuilder().addComponents(select)];
  }

  // Button menu — up to 5 per row, max 25 options = 5 rows
  const rows = [];
  for (let i = 0; i < menu.options.length; i += 5) {
    const chunk = menu.options.slice(i, i + 5);
    const buttons = chunk.map(o => {
      const style = ButtonStyle[o.style] ?? ButtonStyle.Secondary;
      const btn = new ButtonBuilder()
        .setCustomId(`${ROLE_MENU_BUTTON_PREFIX}${menu.id}:${o.roleId}`)
        .setLabel(o.label)
        .setStyle(style);
      if (o.emoji) btn.setEmoji(o.emoji);
      return btn;
    });
    rows.push(new ActionRowBuilder().addComponents(...buttons));
    if (rows.length >= 5) break;
  }
  return rows;
}

/**
 * Build the embed for a role menu message.
 */
export function buildRoleMenuEmbed(menu) {
  return new EmbedBuilder()
    .setTitle(menu.title)
    .setDescription(menu.description ?? "Click a button or select a role below.")
    .setColor(0x5865F2)
    .setFooter({ text: `Role Menu #${menu.id}${menu.exclusive ? " • Exclusive (one at a time)" : ""}` });
}

/**
 * Handle a role menu button interaction.
 * Returns true if handled.
 */
export async function handleRoleMenuButton(interaction) {
  if (!interaction.customId?.startsWith(ROLE_MENU_BUTTON_PREFIX)) return false;

  const parts = interaction.customId.slice(ROLE_MENU_BUTTON_PREFIX.length).split(":");
  const menuId = parseInt(parts[0], 10);
  const roleId = parts[1];

  await interaction.deferReply({ ephemeral: true });

  const menu = await getRoleMenu(interaction.guildId, menuId);
  if (!menu) return interaction.editReply({ content: "Role menu not found." }), true;

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) return interaction.editReply({ content: "Role not found." }), true;

  const member = interaction.member;
  const hasRole = member.roles.cache.has(roleId);

  // If exclusive, remove all other roles from this menu first
  if (menu.exclusive && !hasRole) {
    for (const opt of menu.options) {
      if (opt.roleId !== roleId && member.roles.cache.has(opt.roleId)) {
        await member.roles.remove(opt.roleId).catch(() => null);
      }
    }
  }

  if (hasRole) {
    await member.roles.remove(role).catch(() => null);
    await interaction.editReply({ content: `Role **${role.name}** removed.` });
  } else {
    await member.roles.add(role).catch(() => null);
    await interaction.editReply({ content: `Role **${role.name}** added.` });
  }

  return true;
}

/**
 * Handle a role menu select interaction.
 * Returns true if handled.
 */
export async function handleRoleMenuSelect(interaction) {
  if (!interaction.customId?.startsWith(ROLE_MENU_SELECT_ID)) return false;

  const menuId = parseInt(interaction.customId.slice(ROLE_MENU_SELECT_ID.length), 10);
  await interaction.deferReply({ ephemeral: true });

  const menu = await getRoleMenu(interaction.guildId, menuId);
  if (!menu) return interaction.editReply({ content: "Role menu not found." }), true;

  const selected = new Set(interaction.values);
  const allMenuRoleIds = new Set(menu.options.map(o => o.roleId));
  const member = interaction.member;
  const added = [], removed = [];

  for (const opt of menu.options) {
    if (selected.has(opt.roleId) && !member.roles.cache.has(opt.roleId)) {
      await member.roles.add(opt.roleId).catch(() => null);
      added.push(opt.label);
    } else if (!selected.has(opt.roleId) && member.roles.cache.has(opt.roleId) && allMenuRoleIds.has(opt.roleId)) {
      await member.roles.remove(opt.roleId).catch(() => null);
      removed.push(opt.label);
    }
  }

  const parts = [];
  if (added.length) parts.push(`Added: **${added.join(", ")}**`);
  if (removed.length) parts.push(`Removed: **${removed.join(", ")}**`);
  await interaction.editReply({ content: parts.join("\n") || "No changes." });
  return true;
}
