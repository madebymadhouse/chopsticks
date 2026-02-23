// src/prefix/commands/economy.js
// Prefix economy & social commands — mirrors slash-command logic

import { EmbedBuilder } from "discord.js";
import { getWallet } from "../../economy/wallet.js";
import { claimDaily } from "../../economy/streaks.js";
import { addCredits } from "../../economy/wallet.js";
import { getCooldown, setCooldown, formatCooldown } from "../../economy/cooldowns.js";
import { listShopCategories, listShopItems } from "../../economy/shop.js";
import { getInventory, searchItems } from "../../economy/inventory.js";
import { getGameProfile, addGameXp } from "../../game/profile.js";
import { getDailyQuests } from "../../game/quests.js";
import { sanitizeString } from "../../utils/validation.js";
import { botLogger } from "../../utils/modernLogger.js";
import { generateText } from "../../utils/textLlm.js";
import { httpRequest } from "../../utils/httpFetch.js";

// G5: Prestige title helper
function getPrestigeTitle(prestige) {
  const TITLES = [
    "Apprentice", "Veteran", "Elite", "Champion", "Master",
    "Grandmaster", "Legend", "Mythic", "Eternal", "Transcendent",
  ];
  return TITLES[Math.min(prestige - 1, TITLES.length - 1)] || "Legend";
}

/** Resolve a target user from mention / bare ID / fallback to author */
async function resolveUser(message, args) {
  return (
    message.mentions.users.first() ||
    (args[0]?.match(/^\d{17,19}$/)
      ? await message.client.users.fetch(args[0]).catch(() => null)
      : null) ||
    message.author
  );
}

// ---------------------------------------------------------------------------
// 1. !balance
// ---------------------------------------------------------------------------
const balanceCmd = {
  name: "balance",
  aliases: ["bal", "credits"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const targetUser = await resolveUser(message, args);
      const wallet = await getWallet(targetUser.id);
      const embed = new EmbedBuilder()
        .setTitle("💰 Balance")
        .setColor(0xffd700)
        .setAuthor({ name: targetUser.username })
        .addFields(
          { name: "Wallet", value: String(wallet?.balance ?? 0), inline: true },
          { name: "Bank", value: String(wallet?.bank ?? 0), inline: true },
          { name: "Bank Cap", value: String(wallet?.bank_capacity ?? wallet?.bankCapacity ?? 5000), inline: true }
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:balance error");
      await message.reply("Couldn't fetch balance right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 2. !daily
// ---------------------------------------------------------------------------
const dailyCmd = {
  name: "daily",
  aliases: ["claim", "dr"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message) {
    try {
      const claim = await claimDaily(message.author.id);
      if (!claim.ok) {
        const remaining = (claim.nextClaim ?? Date.now()) - Date.now();
        const embed = new EmbedBuilder()
          .setTitle("⏰ Already Claimed!")
          .setColor(0xff6b6b)
          .setDescription(`Come back in **${formatCooldown(remaining)}**`);
        return await message.reply({ embeds: [embed] });
      }
      await addCredits(message.author.id, claim.totalReward, "daily");
      await addGameXp(message.author.id, 50, { reason: "daily" }).catch(() => {});
      const embed = new EmbedBuilder()
        .setTitle("🎁 Daily Reward")
        .setColor(0x57f287)
        .setDescription(
          `You claimed **${claim.totalReward}** credits!\nStreak: **${claim.streak}** day${claim.streak === 1 ? "" : "s"}`
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:daily error");
      await message.reply("Couldn't process your daily reward right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 3. !work
// ---------------------------------------------------------------------------
const WORK_COOLDOWN_MS = 30 * 60 * 1000;
const WORK_REWARD_MIN = 150;
const WORK_REWARD_MAX = 300;
const JOB_TITLES = [
  "Software Dev", "Chef", "Pilot", "Artist",
  "Mechanic", "Doctor", "Teacher", "Chef",
];

const workCmd = {
  name: "work",
  aliases: ["job", "earn"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message) {
    try {
      const cd = await getCooldown(message.author.id, "work");
      if (!cd.ok) {
        return await message.reply(
          `⏰ You worked too recently! Wait **${formatCooldown(cd.remaining)}**`
        );
      }
      const amount =
        Math.floor(Math.random() * (WORK_REWARD_MAX - WORK_REWARD_MIN + 1)) + WORK_REWARD_MIN;
      await addCredits(message.author.id, amount, "work");
      await setCooldown(message.author.id, "work", WORK_COOLDOWN_MS);
      await addGameXp(message.author.id, 25, { reason: "work" }).catch(() => {});
      const job = JOB_TITLES[Math.floor(Math.random() * JOB_TITLES.length)];
      const embed = new EmbedBuilder()
        .setTitle("💼 Work Complete")
        .setColor(0x57f287)
        .setDescription(`You worked as a **${job}** and earned **${amount}** credits!`);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:work error");
      await message.reply("Couldn't process work right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 4. !shop [category]
// ---------------------------------------------------------------------------
const shopCmd = {
  name: "shop",
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const category = args[0]?.toLowerCase();
      const cats = listShopCategories();

      if (!category || !cats.map(c => c.toLowerCase()).includes(category)) {
        const embed = new EmbedBuilder()
          .setTitle("🏪 Shop Categories")
          .setColor(0x5865f2)
          .setDescription(cats.join(", ") || "No categories available.")
          .setFooter({ text: "Use !shop <category> to see items" });
        return await message.reply({ embeds: [embed] });
      }

      const items = listShopItems(category);
      if (!items || items.length === 0) {
        return await message.reply("No items in that category.");
      }
      const embed = new EmbedBuilder()
        .setTitle(`🏪 Shop — ${category}`)
        .setColor(0x5865f2)
        .addFields(
          items.slice(0, 10).map(i => ({
            name: i.name,
            value: `${i.price ?? i.cost ?? "?"} credits`,
            inline: true,
          }))
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:shop error");
      await message.reply("Couldn't load the shop right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 5. !inventory [@user]
// ---------------------------------------------------------------------------
const inventoryCmd = {
  name: "inventory",
  aliases: ["inv"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const targetUser = await resolveUser(message, args);
      const items = await getInventory(targetUser.id);
      if (!items || items.length === 0) {
        return await message.reply(`📦 **${targetUser.username}**'s inventory is empty.`);
      }
      // Group by item name
      const counts = {};
      for (const item of items) {
        const name = item.item_id ?? item.itemId ?? item.name ?? "Unknown";
        counts[name] = (counts[name] ?? 0) + (item.quantity ?? 1);
      }
      const lines = Object.entries(counts)
        .slice(0, 15)
        .map(([name, qty]) => `${qty}x ${name}`)
        .join(", ");
      const embed = new EmbedBuilder()
        .setTitle("📦 Inventory")
        .setColor(0x9b59b6)
        .setAuthor({ name: targetUser.username })
        .setDescription(lines);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:inventory error");
      await message.reply("Couldn't fetch inventory right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 6. !leaderboard
// ---------------------------------------------------------------------------
const leaderboardCmd = {
  name: "leaderboard",
  aliases: ["lb", "top"],
  rateLimit: 10000,
  guildOnly: true,
  async execute(message) {
    // No getTopWallets utility exists; redirect gracefully.
    await message.reply("📊 Leaderboard is available via `/leaderboard`");
  },
};

// ---------------------------------------------------------------------------
// 7. !profile [@user]
// ---------------------------------------------------------------------------
const profileCmd = {
  name: "profile",
  aliases: ["p"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const targetUser = await resolveUser(message, args);
      const [profile, wallet] = await Promise.all([
        getGameProfile(targetUser.id),
        getWallet(targetUser.id),
      ]);
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Profile`)
        .setColor(0x5865f2)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: "Level", value: String(profile?.level ?? 1), inline: true },
          { name: "XP", value: String(profile?.xp ?? 0), inline: true },
          { name: "Credits", value: String(wallet?.balance ?? 0), inline: true },
          { name: "Bank", value: String(wallet?.bank ?? 0), inline: true }
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:profile error");
      await message.reply("Couldn't fetch profile right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 8. !xp [@user]
// ---------------------------------------------------------------------------
const xpCmd = {
  name: "xp",
  aliases: ["exp", "level", "lvl", "rank"],
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const targetUser = await resolveUser(message, args);
      const profile = await getGameProfile(targetUser.id);
      if (!profile) {
        return await message.reply("No XP data found for that user.");
      }
      const xp = profile.xp ?? 0;
      const filled = Math.floor((xp % 1000) / 100);
      const progress = "█".repeat(filled) + "░".repeat(10 - filled);
      const embed = new EmbedBuilder()
        .setTitle("⭐ XP Progress")
        .setColor(0xf39c12)
        .setAuthor({ name: targetUser.username })
        .addFields(
          { name: "Level", value: String(profile.level ?? 1), inline: true },
          { name: "XP", value: String(xp), inline: true },
          { name: "Title", value: profile.title ?? "Member", inline: true },
          { name: "Progress", value: progress, inline: false }
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:xp error");
      await message.reply("Couldn't fetch XP data right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 9. !quests
// ---------------------------------------------------------------------------
const questsCmd = {
  name: "quests",
  rateLimit: 10000,
  guildOnly: true,
  async execute(message) {
    try {
      const quests = await getDailyQuests(message.author.id).catch(() => null);
      if (!quests || quests.length === 0) {
        return await message.reply(
          "📋 No active quests. Use `/quests` to see available quests."
        );
      }
      const embed = new EmbedBuilder()
        .setTitle("📋 Active Quests")
        .setColor(0xe74c3c)
        .addFields(
          quests.slice(0, 10).map(q => ({
            name: q.name ?? q.quest_id ?? "Quest",
            value: q.description ?? `Progress: ${q.progress ?? 0}/${q.goal ?? "?"}`,
            inline: false,
          }))
        );
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:quests error");
      await message.reply("Use `/quests` for your quest overview.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 10. !compliment [@user]
// ---------------------------------------------------------------------------
const FALLBACK_COMPLIMENTS = [
  "Their code is so clean you could eat off it.",
  "They're the kind of person who writes comments in their code — and good ones.",
  "They reply to messages within 24 hours, which puts them in the top 1%.",
  "Their commits actually have meaningful messages.",
  "They test their code before pushing to main.",
  "They're the reason the server's uptime is good.",
  "They read the docs AND the source code.",
  "They're so reliable, GitHub Actions send them thank-you notes.",
  "Their error handling is genuinely thoughtful.",
  "They close issues they open.",
];

const complimentCmd = {
  name: "compliment",
  rateLimit: 30000,
  async execute(message, args) {
    try {
      const targetUser = await resolveUser(message, args);
      const guildId = message.guildId;
      const prompt = `Give a short, genuine compliment for a Discord user named ${targetUser.username} (2 sentences max, positive only)`;
      let complimentText = await generateText({ guildId, prompt }).catch(() => "");
      if (!complimentText) {
        complimentText =
          FALLBACK_COMPLIMENTS[Math.floor(Math.random() * FALLBACK_COMPLIMENTS.length)];
      }
      const embed = new EmbedBuilder()
        .setTitle("✨ Compliment")
        .setColor(0x57f287)
        .setAuthor({ name: `${message.author.username} compliments ${targetUser.username}` })
        .setDescription(complimentText)
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }));
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:compliment error");
      const fallback =
        FALLBACK_COMPLIMENTS[Math.floor(Math.random() * FALLBACK_COMPLIMENTS.length)];
      await message
        .reply({ embeds: [new EmbedBuilder().setTitle("✨ Compliment").setColor(0x57f287).setDescription(fallback)] })
        .catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 11. !trivia
// ---------------------------------------------------------------------------
const TRIVIA_FALLBACK =
  "What is 2+2?\n**A:** 3  **B:** 4  **C:** 5  **D:** 6\n*(Answer: B)*";

const triviaCmd = {
  name: "trivia",
  rateLimit: 10000,
  async execute(message) {
    try {
      const { statusCode, body } = await httpRequest(
        "opentdb",
        "https://opentdb.com/api.php?amount=1&type=multiple&encode=base64",
        { method: "GET" }
      );
      if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
      const json = await body.json();
      const q = json?.results?.[0];
      if (!q) throw new Error("No question returned");

      const question = Buffer.from(q.question, "base64").toString("utf8");
      const correct = Buffer.from(q.correct_answer, "base64").toString("utf8");
      const incorrect = q.incorrect_answers.map(a =>
        Buffer.from(a, "base64").toString("utf8")
      );
      const choices = [...incorrect, correct].sort(() => Math.random() - 0.5);
      const labels = ["A", "B", "C", "D"];
      const fields = choices.map((c, i) => ({
        name: labels[i],
        value: c,
        inline: true,
      }));

      const embed = new EmbedBuilder()
        .setTitle("🎯 Trivia")
        .setColor(0x9b59b6)
        .setDescription(question)
        .addFields(fields)
        .setFooter({ text: "Type A, B, C, or D to answer" });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:trivia error");
      await message.reply(`🎯 **Trivia**\n${TRIVIA_FALLBACK}`).catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 12. !riddle
// ---------------------------------------------------------------------------
const RIDDLES = [
  { q: "I speak without a mouth and hear without ears. What am I?", a: "An echo" },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
  { q: "I have cities, but no houses live there. I have mountains but no trees. What am I?", a: "A map" },
  { q: "What has keys but no locks, space but no room, and you can enter but can't go inside?", a: "A keyboard" },
  { q: "The more you remove, the bigger I become. What am I?", a: "A hole" },
  { q: "What comes once in a minute, twice in a moment, but never in a thousand years?", a: "The letter M" },
  { q: "I'm tall when I'm young, and I'm short when I'm old. What am I?", a: "A candle" },
  { q: "What has hands but can't clap?", a: "A clock" },
];

const riddleCmd = {
  name: "riddle",
  rateLimit: 15000,
  async execute(message) {
    try {
      const riddle = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      const embed = new EmbedBuilder()
        .setTitle("🧩 Riddle")
        .setColor(0xe67e22)
        .setDescription(riddle.q)
        .addFields({ name: "Answer (click to reveal)", value: `||${riddle.a}||`, inline: false });
      await message.reply({ embeds: [embed] });
    } catch (err) {
      botLogger.warn({ err }, "prefix:riddle error");
      await message.reply("Couldn't load a riddle right now.").catch(() => {});
    }
  },
};

// ---------------------------------------------------------------------------
// 13. !craft <item>
// ---------------------------------------------------------------------------
const craftCmd = {
  name: "craft",
  rateLimit: 5000,
  guildOnly: true,
  async execute(message, args) {
    try {
      const itemName = sanitizeString(args.join(" "));
      if (!itemName) {
        return await message.reply("Usage: `!craft <item name>`");
      }
      const items = searchItems(itemName);
      if (!items || items.length === 0) {
        return await message.reply(
          `❌ Item **${itemName}** not found. Use \`!shop\` to browse items.`
        );
      }
      await message.reply(
        `⚒️ To craft **${items[0].name}**, use: \`/craft ${items[0].name}\``
      );
    } catch (err) {
      botLogger.warn({ err }, "prefix:craft error");
      await message.reply("Couldn't process craft right now.").catch(() => {});
    }
  },
};

export default [
  balanceCmd,
  dailyCmd,
  workCmd,
  shopCmd,
  inventoryCmd,
  leaderboardCmd,
  profileCmd,
  xpCmd,
  questsCmd,
  complimentCmd,
  triviaCmd,
  riddleCmd,
  craftCmd,

  // ── Cycle G5: Prestige command ────────────────────────────────────────────
  {
    name: "prestige",
    aliases: ["ascend", "reset"],
    description: "Prestige — reset to level 1 for exclusive perks — !prestige",
    guildOnly: true,
    rateLimit: 10000,
    async execute(message) {
      const { getGameProfile, addGameXp } = await import("../../game/profile.js");
      const { getWallet, addCredits } = await import("../../economy/wallet.js");
      const { EmbedBuilder } = await import("discord.js");
      const PRESTIGE_LEVEL_REQ = 50;

      const profile = await getGameProfile(message.author.id).catch(() => null);
      if (!profile) return message.reply("❌ Couldn't load your profile. Try again!");

      const level = profile.level || 1;
      if (level < PRESTIGE_LEVEL_REQ) {
        const embed = new EmbedBuilder()
          .setTitle("✨ Prestige System")
          .setDescription([
            `You need to be **Level ${PRESTIGE_LEVEL_REQ}** to prestige.`,
            `You are currently **Level ${level}**.`,
            "",
            `**Prestige Rewards:**`,
            `• ⭐ Prestige badge next to your name`,
            `• 💰 **5,000 credits** bonus`,
            `• 🏆 Exclusive **Prestige** title`,
            `• 🎁 Legendary crate`,
            "",
            `Keep grinding! ${PRESTIGE_LEVEL_REQ - level} more levels to go.`,
          ].join("\n"))
          .setColor(0xF0B232)
          .setFooter({ text: "Chopsticks !prestige" });
        return message.reply({ embeds: [embed] });
      }

      // Get current prestige count from profile title
      const currentPrestige = profile.prestige || 0;
      const newPrestige = currentPrestige + 1;

      // Reset XP to 0 (prestige wipe)
      try {
        const { getPool } = await import("../../utils/storage_pg.js");
        const pool = getPool();
        await pool.query(
          `UPDATE user_game_profiles SET xp = 0, level = 1, prestige = $1, updated_at = $2 WHERE user_id = $3`,
          [newPrestige, Date.now(), message.author.id]
        );
      } catch {
        return message.reply("❌ Prestige failed — database error. Try again!");
      }

      // Award prestige bonus credits
      await addCredits(message.author.id, 5000 * newPrestige, "prestige_bonus").catch(() => {});

      const PRESTIGE_STARS = ["⭐", "🌟", "💫", "✨", "🔥", "👑", "🌈", "💎", "🌙", "☀️"];
      const star = PRESTIGE_STARS[Math.min(newPrestige - 1, PRESTIGE_STARS.length - 1)];

      const embed = new EmbedBuilder()
        .setTitle(`${star} PRESTIGE ${newPrestige} — ${message.author.username}!`)
        .setDescription([
          `You have reached **Prestige ${newPrestige}**! Your journey starts anew.`,
          "",
          `**Rewards:**`,
          `• 💰 **${(5000 * newPrestige).toLocaleString()} credits** added to your wallet`,
          `• 🎖️ Prestige **${newPrestige}** badge`,
          `• 🏆 Title: **${getPrestigeTitle(newPrestige)}**`,
          "",
          `Your XP and level have been reset. Time to grind again! 💪`,
        ].join("\n"))
        .setColor(0xF0B232)
        .setThumbnail(message.author.displayAvatarURL())
        .setFooter({ text: `Prestige ${newPrestige} • Chopsticks !prestige` });
      await message.reply({ embeds: [embed] });
    }
  },
];
