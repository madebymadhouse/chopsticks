import { PermissionsBitField, EmbedBuilder } from "discord.js";
import { reply, replyError, replySuccess, parseIntSafe, dm } from "../helpers.js";
import { loadGuildData, saveGuildData } from "../../utils/storage.js";
import { schedule } from "../../utils/scheduler.js";
import { normalizePrefixValue } from "../hardening.js";
import COLORS from "../../utils/colors.js";

export default [
  {
    name: "poll",
    description: "Create a reaction poll — !poll Question | opt1, opt2, ...",
    rateLimit: 10000,
    async execute(message, args) {
      const text = args.join(" ");
      const parts = text.split("|");
      const q = parts[0]?.trim();
      const optsRaw = parts.slice(1).join("|").trim();
      if (!q || !optsRaw) return replyError(message, "Usage: `!poll Question | opt1, opt2, opt3`");
      const items = optsRaw.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10);
      if (items.length < 2) return replyError(message, "Need at least **2** options separated by commas.");
      const emoji = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const lines = items.map((o, i) => `${emoji[i]} ${o}`);

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${q}`)
        .setDescription(lines.join("\n"))
        .setColor(COLORS.INFO)
        .setFooter({ text: `Poll by ${message.author.username} · React to vote` })
        .setTimestamp();

      const msg = await message.channel.send({ embeds: [embed] });
      for (let i = 0; i < items.length; i++) await msg.react(emoji[i]).catch(() => {});
      await message.delete().catch(() => {});
    }
  },
  {
    name: "giveaway",
    description: "Start a giveaway — !giveaway <minutes> <winners> <prize>",
    guildOnly: true,
    rateLimit: 10000,
    userPerms: [PermissionsBitField.Flags.ManageGuild],
    async execute(message, args) {
      const mins    = parseIntSafe(args[0], 1, 10080);
      const winners = parseIntSafe(args[1], 1, 20);
      const prize   = args.slice(2).join(" ").trim();
      if (!mins || !winners || !prize) {
        return replyError(message, "Usage: `!giveaway <minutes> <winners> <prize>`");
      }

      const endsAt = new Date(Date.now() + mins * 60 * 1000);
      const embed  = new EmbedBuilder()
        .setTitle("🎉 GIVEAWAY")
        .setColor(0xFF73FA)
        .addFields(
          { name: "🏆 Prize", value: `**${prize}**`, inline: false },
          { name: "🎟️ Winners", value: `**${winners}**`, inline: true },
          { name: "⏱️ Duration", value: `**${mins}** minute${mins !== 1 ? "s" : ""}`, inline: true },
          { name: "⏰ Ends", value: `<t:${Math.floor(endsAt.getTime()/1000)}:R>`, inline: true },
        )
        .setFooter({ text: `Hosted by ${message.author.username} · React 🎉 to enter` })
        .setTimestamp(endsAt);

      const msg = await message.channel.send({ embeds: [embed] });
      await msg.react("🎉").catch(() => {});

      schedule(`giveaway:${msg.id}`, mins * 60 * 1000, async () => {
        const m = await message.channel.messages.fetch(msg.id).catch(() => null);
        if (!m) return;
        const reaction = m.reactions.cache.get("🎉");
        if (!reaction) return;
        await reaction.users.fetch();
        const pool = reaction.users.cache.filter(u => !u.bot).map(u => u.id);
        const picked = [];
        const poolCopy = [...pool];
        while (poolCopy.length && picked.length < winners) {
          picked.push(poolCopy.splice(Math.floor(Math.random() * poolCopy.length), 1)[0]);
        }
        const text = picked.length
          ? picked.map(id => `<@${id}>`).join(", ")
          : "No valid entries.";

        const endEmbed = new EmbedBuilder()
          .setTitle("🎉 Giveaway Ended")
          .setColor(0xFF73FA)
          .addFields(
            { name: "🏆 Prize", value: `**${prize}**` },
            { name: `🎊 Winner${picked.length !== 1 ? "s" : ""}`, value: text },
          )
          .setFooter({ text: `Hosted by ${message.author.username}` })
          .setTimestamp();

        await m.edit({ embeds: [endEmbed] });
        await m.reply({ content: `🎉 Congratulations ${text}! You won **${prize}**!`, allowedMentions: { parse: ["users"] } });
      });
    }
  },
  {
    name: "remind",
    description: "Set a reminder — !remind <minutes> <message>",
    rateLimit: 5000,
    async execute(message, args) {
      const mins = parseIntSafe(args[0], 1, 10080);
      const text = args.slice(1).join(" ").trim();
      if (!mins || !text) return replyError(message, "Usage: `!remind <minutes> <message>`");

      schedule(`remind:${message.author.id}:${Date.now()}`, mins * 60 * 1000, async () => {
        await dm(message.author, `⏰ **Reminder:** ${text}`);
      });

      await replySuccess(message, `I'll remind you in **${mins}** minute${mins !== 1 ? "s" : ""}.`);
    }
  },
  {
    name: "welcome",
    description: "Configure welcome messages — !welcome <set|message|disable>",
    guildOnly: true,
    rateLimit: 5000,
    userPerms: [PermissionsBitField.Flags.ManageGuild],
    async execute(message, args) {
      const sub = (args[0] || "").toLowerCase();
      const data = await loadGuildData(message.guildId);
      data.welcome ??= { enabled: false, channelId: null, message: "Welcome {user}!" };

      if (sub === "set") {
        const channelId = args[1]?.replace(/[<#>]/g, "");
        if (!channelId) return replyError(message, "Usage: `!welcome set #channel`");
        data.welcome.channelId = channelId;
        data.welcome.enabled = true;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, `Welcome channel set to <#${channelId}>.`);
      }
      if (sub === "message") {
        const msg = args.slice(1).join(" ");
        if (!msg) return replyError(message, "Provide a welcome message. Use `{user}` for the mention.");
        data.welcome.message = msg;
        data.welcome.enabled = true;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, `Welcome message updated.`);
      }
      if (sub === "disable") {
        data.welcome.enabled = false;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, "Welcome messages disabled.");
      }
      const embed = new EmbedBuilder()
        .setTitle("👋 Welcome Configuration")
        .setColor(COLORS.INFO)
        .addFields(
          { name: "Status",   value: data.welcome.enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Channel",  value: data.welcome.channelId ? `<#${data.welcome.channelId}>` : "Not set", inline: true },
          { name: "Message",  value: `\`${data.welcome.message}\``, inline: false },
        )
        .setFooter({ text: "!welcome set #channel | !welcome message <text> | !welcome disable" });
      return reply(message, embed);
    }
  },
  {
    name: "autorole",
    description: "Configure auto-role — !autorole <set|disable>",
    guildOnly: true,
    rateLimit: 5000,
    userPerms: [PermissionsBitField.Flags.ManageGuild],
    async execute(message, args) {
      const sub = (args[0] || "").toLowerCase();
      const data = await loadGuildData(message.guildId);
      data.autorole ??= { enabled: false, roleId: null };

      if (sub === "set") {
        const roleId = args[1]?.replace(/[<@&>]/g, "");
        if (!roleId) return replyError(message, "Usage: `!autorole set @role`");
        data.autorole.roleId = roleId;
        data.autorole.enabled = true;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, `Auto-role set to <@&${roleId}>.`);
      }
      if (sub === "disable") {
        data.autorole.enabled = false;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, "Auto-role disabled.");
      }
      const embed = new EmbedBuilder()
        .setTitle("🎭 Auto-Role Configuration")
        .setColor(COLORS.INFO)
        .addFields(
          { name: "Status", value: data.autorole.enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
          { name: "Role",   value: data.autorole.roleId ? `<@&${data.autorole.roleId}>` : "Not set", inline: true },
        )
        .setFooter({ text: "!autorole set @role | !autorole disable" });
      return reply(message, embed);
    }
  },
  {
    name: "prefix",
    description: "View or change the command prefix — !prefix [set <value>|reset]",
    guildOnly: true,
    rateLimit: 5000,
    userPerms: [PermissionsBitField.Flags.ManageGuild],
    async execute(message, args) {
      const sub = (args[0] || "").toLowerCase();
      const data = await loadGuildData(message.guildId);
      data.prefix ??= { value: "!", aliases: {} };

      if (sub === "set") {
        const p = args[1];
        if (!p) return replyError(message, "Usage: `!prefix set <value>`  (1-4 characters)");
        const normalized = normalizePrefixValue(p);
        if (!normalized.ok) return replyError(message, normalized.error);
        data.prefix.value = normalized.value;
        await saveGuildData(message.guildId, data);
        return replySuccess(message, `Prefix updated to \`${data.prefix.value}\`. Use \`${data.prefix.value}help\` to get started.`);
      }
      if (sub === "reset") {
        data.prefix.value = "!";
        await saveGuildData(message.guildId, data);
        return replySuccess(message, "Prefix reset to `!`.");
      }

      const embed = new EmbedBuilder()
        .setTitle("⚙️ Prefix Settings")
        .setColor(COLORS.INFO)
        .addFields(
          { name: "Current Prefix", value: `\`${data.prefix.value || "!"}\``, inline: true },
        )
        .setFooter({ text: `!prefix set <value>  ·  !prefix reset` });
      return reply(message, embed);
    }
  }
];

