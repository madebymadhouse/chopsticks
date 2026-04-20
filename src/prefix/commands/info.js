import { EmbedBuilder, time, TimestampStyles } from "discord.js";
import { reply, replyError, fmtUptime, parseUserId, parseRoleId } from "../helpers.js";
import COLORS from "../../utils/colors.js";


// ── Permission summary helpers ───────────────────────────────────────────────
const KEY_PERM_FLAGS = [
  ["Administrator",    "⚔️ Admin"],
  ["ManageGuild",      "🏰 Manage Server"],
  ["ManageRoles",      "🏷️ Manage Roles"],
  ["ManageChannels",   "📺 Manage Channels"],
  ["BanMembers",       "🔨 Ban Members"],
  ["KickMembers",      "👢 Kick Members"],
  ["ModerateMembers",  "🔇 Timeout Members"],
  ["ManageMessages",   "🗑️ Manage Messages"],
  ["MentionEveryone",  "📢 Mention Everyone"],
];

function buildPermSummary(permissions) {
  const has = KEY_PERM_FLAGS.filter(([flag]) => permissions.has(flag)).map(([, label]) => label);
  return has.length ? has.join(" · ") : "No elevated permissions";
}

function buildRolePermSummary(permissions) {
  const has = KEY_PERM_FLAGS.filter(([flag]) => permissions.has(flag)).map(([, label]) => label);
  return has.length ? has.join(" · ") : null;
}



export default [
  {
    name: "serverinfo",
    aliases: ["si", "server", "guildinfo"],
    guildOnly: true,
    description: "Show detailed server information",
    rateLimit: 5000,
    async execute(message) {
      const g = message.guild;
      await g.fetch().catch(() => {});
      const owner = await g.fetchOwner().catch(() => null);
      const textChannels  = g.channels.cache.filter(c => c.type === 0).size;
      const voiceChannels = g.channels.cache.filter(c => c.type === 2).size;
      const categories    = g.channels.cache.filter(c => c.type === 4).size;
      const boosts        = g.premiumSubscriptionCount ?? 0;
      const verificationLevels = ["None","Low","Medium","High","Very High"];

      const embed = new EmbedBuilder()
        .setTitle(`🏰 ${g.name}`)
        .setThumbnail(g.iconURL({ size: 256 }) || null)
        .setColor(COLORS.INFO)
        .addFields(
          { name: "👑 Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
          { name: "🆔 Server ID", value: `\`${g.id}\``, inline: true },
          { name: "📅 Created", value: time(g.createdAt, TimestampStyles.ShortDate), inline: true },
          { name: "👥 Members", value: `**${g.memberCount}**`, inline: true },
          { name: "🏷️ Roles", value: `**${g.roles.cache.size}**`, inline: true },
          { name: "😀 Emojis", value: `**${g.emojis.cache.size}**`, inline: true },
          { name: "💬 Text", value: `**${textChannels}**`, inline: true },
          { name: "🔊 Voice", value: `**${voiceChannels}**`, inline: true },
          { name: "📂 Categories", value: `**${categories}**`, inline: true },
          { name: "✨ Boosts", value: `**${boosts}** (Tier ${g.premiumTier})`, inline: true },
          { name: "🔒 Verification", value: verificationLevels[g.verificationLevel] ?? "Unknown", inline: true },
          { name: "📍 Region", value: g.preferredLocale ?? "Auto", inline: true },
        )
        .setFooter({ text: "Chopsticks • !serverinfo" });

      if (g.bannerURL()) embed.setImage(g.bannerURL({ size: 1024 }));
      await reply(message, embed);
    }
  },
  {
    name: "userinfo",
    aliases: ["ui", "whois", "user"],
    description: "Show user information — !userinfo [@user]",
    rateLimit: 3000,
    async execute(message, args) {
      const rawId = parseUserId(args[0]) || message.author.id;
      const user = await message.client.users.fetch(rawId).catch(() => null);
      if (!user) return replyError(message, "User not found.");

      const member = message.guild?.members.cache.get(user.id)
        ?? await message.guild?.members.fetch(user.id).catch(() => null);

      const topRole = member?.roles.cache
        .filter(r => r.id !== message.guild?.id)
        .sort((a, b) => b.position - a.position)
        .first();

      const badges = [];
      if (user.bot) badges.push("🤖 Bot");
      if (member?.premiumSince) badges.push("💎 Booster");

      const embed = new EmbedBuilder()
        .setTitle(`${user.displayName} (${user.username})`)
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .setColor(topRole?.color || COLORS.INFO)
        .addFields(
          { name: "🆔 User ID", value: `\`${user.id}\``, inline: true },
          { name: "📅 Account Created", value: time(user.createdAt, TimestampStyles.ShortDate), inline: true },
          ...(badges.length ? [{ name: "🏅 Badges", value: badges.join(" "), inline: true }] : []),
          ...(member ? [
            { name: "📅 Joined Server", value: member.joinedAt ? time(member.joinedAt, TimestampStyles.ShortDate) : "Unknown", inline: true },
            { name: "🏷️ Top Role", value: topRole ? `<@&${topRole.id}>` : "None", inline: true },
            { name: "🎭 Roles", value: `**${Math.max(0, member.roles.cache.size - 1)}**`, inline: true },
            { name: "🔑 Key Perms", value: buildPermSummary(member.permissions), inline: false },
          ] : []),
        )
        .setFooter({ text: "Chopsticks • !userinfo" });

      await reply(message, embed);
    }
  },
  {
    name: "avatar",
    aliases: ["av", "pfp", "icon"],
    description: "Show user avatar — !avatar [@user]",
    rateLimit: 3000,
    async execute(message, args) {
      const rawId = parseUserId(args[0]) || message.author.id;
      const user = await message.client.users.fetch(rawId).catch(() => null);
      if (!user) return replyError(message, "User not found.");

      const urls = {
        PNG:  user.displayAvatarURL({ size: 512, extension: "png" }),
        WEBP: user.displayAvatarURL({ size: 512, extension: "webp" }),
        ...(user.avatar?.startsWith("a_") ? { GIF: user.displayAvatarURL({ size: 512, extension: "gif" }) } : {}),
      };

      const embed = new EmbedBuilder()
        .setTitle(`🖼️ ${user.displayName}'s Avatar`)
        .setImage(urls.GIF ?? urls.PNG)
        .setDescription(Object.entries(urls).map(([fmt, url]) => `[${fmt}](${url})`).join("  ·  "))
        .setColor(COLORS.INFO)
        .setFooter({ text: "Chopsticks • !avatar" });

      await reply(message, embed);
    }
  },
  {
    name: "roleinfo",
    aliases: ["ri"],
    guildOnly: true,
    description: "Show role information — !roleinfo <@role|ID>",
    rateLimit: 3000,
    async execute(message, args) {
      const id = parseRoleId(args[0]);
      if (!id) return replyError(message, "Provide a role @mention or ID.");
      const role = message.guild.roles.cache.get(id);
      if (!role) return replyError(message, "Role not found.");

      const keyPerms = buildRolePermSummary(role.permissions);

      const embed = new EmbedBuilder()
        .setTitle(`🏷️ ${role.name}`)
        .setColor(role.color || 0x99AAB5)
        .addFields(
          { name: "🆔 Role ID", value: `\`${role.id}\``, inline: true },
          { name: "👥 Members", value: `**${role.members.size}**`, inline: true },
          { name: "🎨 Color", value: `\`${role.hexColor}\``, inline: true },
          { name: "📌 Hoisted", value: role.hoist ? "✅ Yes" : "❌ No", inline: true },
          { name: "🔔 Mentionable", value: role.mentionable ? "✅ Yes" : "❌ No", inline: true },
          { name: "📊 Position", value: `\`${role.position}\``, inline: true },
          { name: "📅 Created", value: time(role.createdAt, TimestampStyles.ShortDate), inline: true },
          ...(keyPerms ? [{ name: "🔑 Key Permissions", value: keyPerms, inline: false }] : []),
        )
        .setFooter({ text: "Chopsticks • !roleinfo" });

      await reply(message, embed);
    }
  },
  {
    name: "botinfo",
    aliases: ["bi", "about", "info"],
    description: "Show bot information",
    rateLimit: 5000,
    async execute(message) {
      const client = message.client;
      const upSec   = Math.floor(process.uptime());
      const memMb   = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      const ping    = Math.round(client.ws.ping);
      const guilds  = client.guilds.cache.size;
      const users   = client.guilds.cache.reduce((n, g) => n + g.memberCount, 0);
      const pingColor = ping < 100 ? 0x57F287 : ping < 250 ? 0xFEE75C : 0xED4245;

      const mgr = global.agentManager;
      const agentCount   = mgr?.listAgents?.()?.length ?? 0;
      const sessionCount = (mgr?.listSessions?.()?.length ?? 0) + (mgr?.listAssistantSessions?.()?.length ?? 0);

      const embed = new EmbedBuilder()
        .setTitle(`🤖 ${client.user.username}`)
        .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
        .setColor(pingColor)
        .addFields(
          { name: "🌐 Servers",    value: `**${guilds}**`,           inline: true },
          { name: "👥 Users",      value: `**${users.toLocaleString()}**`, inline: true },
          { name: "📡 Ping",       value: `**${ping}ms**`,           inline: true },
          { name: "⏱️ Uptime",     value: `**${fmtUptime(upSec)}**`, inline: true },
          { name: "💾 Memory",     value: `**${memMb}MB**`,          inline: true },
          { name: "🤖 Agents",     value: `**${agentCount}** online · **${sessionCount}** sessions`, inline: true },
          { name: "📦 Version",    value: `Node.js ${process.version}`, inline: true },
        )
        .setFooter({ text: "Chopsticks by Mad House" })
        .setTimestamp();

      await reply(message, embed);
    }
  },
  {
    name: "invite",
    aliases: ["inv", "add"],
    description: "Get the bot invite link",
    rateLimit: 10000,
    async execute(message) {
      const clientId = message.client.user.id;
      const perms = "8"; // Administrator — let guild owners decide
      const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands`;

      const embed = new EmbedBuilder()
        .setTitle("➕ Add Chopsticks to your server")
        .setColor(COLORS.INFO)
        .setDescription(`[**Click here to invite Chopsticks**](${url})\n\nChopsticks brings music, leveling, economy, AI agents, moderation, and more to your server.`)
        .setThumbnail(message.client.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: "Chopsticks by Mad House" });

      await reply(message, embed);
    }
  },
];

