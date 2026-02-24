// src/tools/customcmd/executor.js
// Resolves variables in custom command responses and sends the output.

import { EmbedBuilder } from "discord.js";
import { incrementUses } from "./store.js";

const RANDOM_RE = /\{random:([^}]+)\}/g;
const ARG_IDX_RE = /\{arg\[(\d+)\]\}/g;

/**
 * Resolve all variables in a template string.
 * @param {string} template
 * @param {{ user, guild, member, args: string[] }} ctx
 */
function resolve(template, ctx) {
  return template
    .replace(/\{user\}/g, `<@${ctx.user.id}>`)
    .replace(/\{username\}/g, ctx.user.username)
    .replace(/\{server\}/g, ctx.guild.name)
    .replace(/\{membercount\}/g, String(ctx.guild.memberCount))
    .replace(/\{args\}/g, ctx.args.join(" "))
    .replace(ARG_IDX_RE, (_, i) => ctx.args[Number(i)] ?? "")
    .replace(RANDOM_RE, (_, choices) => {
      const parts = choices.split("|").filter(Boolean);
      return parts[Math.floor(Math.random() * parts.length)] ?? "";
    });
}

/**
 * Execute a custom command in the given message context.
 * @param {import("discord.js").Message} message
 * @param {object} cmd - Custom command record
 * @param {string[]} args - Arguments after the command trigger
 */
export async function executeCustomCmd(message, cmd, args) {
  if (!cmd.enabled) return;

  // Channel restriction
  if (cmd.allowedChannelId && message.channelId !== cmd.allowedChannelId) return;

  // Role restriction
  if (cmd.requiredRoleId) {
    const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
    if (!member?.roles.cache.has(cmd.requiredRoleId)) return;
  }

  const ctx = {
    user: message.author,
    guild: message.guild,
    member: message.member,
    args,
  };

  const resolved = resolve(cmd.response, ctx);

  try {
    if (cmd.deleteInput) await message.delete().catch(() => null);

    let target = message.channel;
    if (cmd.dmUser) {
      target = await message.author.createDM().catch(() => message.channel);
    }

    if (cmd.asEmbed) {
      const embed = new EmbedBuilder()
        .setDescription(resolved)
        .setColor(cmd.embedColor ? Number(cmd.embedColor) : 0x5865F2);
      if (cmd.embedTitle) embed.setTitle(resolve(cmd.embedTitle, ctx));
      await target.send({ embeds: [embed] });
    } else {
      await target.send(resolved.slice(0, 2000));
    }

    await incrementUses(message.guildId, cmd.name);
  } catch { /* executor errors must not crash the bot */ }
}
