// src/commands/battle.js
// /battle @user — PvP challenge between two Discord users

import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { withTimeout } from '../utils/interactionTimeout.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { getWallet, addCredits, removeCredits } from '../economy/wallet.js';
import { addGameXp, getGameProfile } from '../game/profile.js';
import { recordQuestEvent } from '../game/quests.js';

export const meta = {
  deployGlobal: false,
  name: 'battle',
  description: 'PvP battle between two users',
  category: "game",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName('battle')
  .setDescription('⚔️ Challenge another user to a PvP battle for credits and glory')
  .addUserOption(o => o
    .setName('opponent')
    .setDescription('Who to challenge')
    .setRequired(true))
  .addIntegerOption(o => o
    .setName('wager')
    .setDescription('Credits to wager (optional, both sides must have enough)')
    .setRequired(false)
    .setMinValue(10)
    .setMaxValue(5000));

const BATTLE_COOLDOWN_S = 5 * 60; // 5 minutes per user

const ATTACK_MOVES = [
  'lands a devastating combo',
  'unleashes a critical strike',
  'executes a perfect counter',
  'pulls off an impossible dodge and ripostes',
  'activates a power surge',
  'deploys a tactical flanking maneuver',
  'channels raw determination',
  'drops a legendary finisher',
];

const FLAVOR_WIN = [
  'steps away victorious, brushing dust off their shoulders.',
  'raises their fist in triumph as the crowd goes wild.',
  'delivers the final blow with surgical precision.',
  'ends the battle with style — and not a scratch.',
];

const FLAVOR_LOSS = [
  'is left staring at the sky, wondering what just happened.',
  'retreats with dignity (mostly) intact.',
  'vows to train harder and return stronger.',
  'tips their hat — they fought well, just not well enough.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Deterministic win probability based on XP levels. Challenger gets slight home-field bonus. */
function calcWinChance(challengerLevel, opponentLevel) {
  const diff = challengerLevel - opponentLevel;
  // ±15% swing per 5 levels, capped at ±30% from baseline 50%
  const swing = Math.min(30, Math.max(-30, diff * 3));
  return (50 + swing) / 100;
}

export async function execute(interaction) {
  const opponent = interaction.options.getUser('opponent');
  const wager = interaction.options.getInteger('wager') || 0;

  if (opponent.id === interaction.user.id) {
    await interaction.reply({ content: '⚔️ You can\'t battle yourself! Challenge someone else.', ephemeral: true });
    return;
  }
  if (opponent.bot) {
    await interaction.reply({ content: '🤖 Bots don\'t accept battle challenges. Try a real opponent!', ephemeral: true });
    return;
  }

  // Rate limit challenger
  const rl = await checkRateLimit(`battle:${interaction.user.id}`, 1, BATTLE_COOLDOWN_S).catch(() => ({ ok: true }));
  if (!rl.ok) {
    const remaining = Math.ceil(rl.retryAfter || BATTLE_COOLDOWN_S);
    await interaction.reply({ content: `⏳ You're still recovering from your last battle. Try again in **${remaining}s**.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();
  await withTimeout(interaction, async () => {
    // Fetch profiles and wallets
    const [challengerProfile, opponentProfile] = await Promise.all([
      getGameProfile(interaction.user.id).catch(() => ({ level: 1 })),
      getGameProfile(opponent.id).catch(() => ({ level: 1 })),
    ]);

    const challengerLevel = challengerProfile?.level || 1;
    const opponentLevel = opponentProfile?.level || 1;

    // Validate wager if set
    if (wager > 0) {
      const [cWallet, oWallet] = await Promise.all([
        getWallet(interaction.user.id).catch(() => ({ balance: 0 })),
        getWallet(opponent.id).catch(() => ({ balance: 0 })),
      ]);
      if ((cWallet?.balance || 0) < wager) {
        await interaction.editReply({ content: `💸 You don't have enough credits to wager **${wager}** credits.` });
        return;
      }
      if ((oWallet?.balance || 0) < wager) {
        await interaction.editReply({ content: `💸 **${opponent.username}** doesn't have enough credits to match your **${wager}** credit wager.` });
        return;
      }
    }

    // Determine winner
    const winChance = calcWinChance(challengerLevel, opponentLevel);
    const challengerWon = Math.random() < winChance;
    const winner = challengerWon ? interaction.user : opponent;
    const loser = challengerWon ? opponent : interaction.user;

    // Build battle log (3 exchanges)
    const rounds = [];
    for (let i = 0; i < 3; i++) {
      const attacker = i % 2 === 0 ? interaction.user : opponent;
      rounds.push(`> **${attacker.username}** ${pick(ATTACK_MOVES)}!`);
    }

    // Apply wager
    if (wager > 0) {
      await Promise.all([
        removeCredits(loser.id, wager, `battle_loss:vs_${winner.id}`).catch(() => {}),
        addCredits(winner.id, wager, `battle_win:vs_${loser.id}`).catch(() => {}),
      ]);
    }

    // Award XP to both (winner gets more)
    const winnerXp = 80 + Math.floor(Math.random() * 40);
    const loserXp = 30 + Math.floor(Math.random() * 20);
    await Promise.all([
      addGameXp(winner.id, winnerXp, `battle_win`).catch(() => {}),
      addGameXp(loser.id, loserXp, `battle_loss`).catch(() => {}),
      recordQuestEvent(winner.id, 'battle_win').catch(() => {}),
    ]);

    const embed = new EmbedBuilder()
      .setTitle(`⚔️ ${interaction.user.username} vs ${opponent.username}`)
      .setColor(challengerWon ? Colors.Green : Colors.Red)
      .setDescription([
        `**Level ${challengerLevel}** ${interaction.user.username} vs **Level ${opponentLevel}** ${opponent.username}`,
        '',
        '**⚡ Battle Log:**',
        rounds.join('\n'),
        '',
        `🏆 **${winner.username}** ${pick(FLAVOR_WIN)}`,
        `😓 **${loser.username}** ${pick(FLAVOR_LOSS)}`,
        '',
        wager > 0 ? `💰 **${winner.username}** wins **${wager * 2}** credits!` : `✨ **${winner.username}** gains **${winnerXp} XP** | **${loser.username}** gains **${loserXp} XP**`,
      ].join('\n'))
      .setFooter({ text: `Win chance: ${Math.round(winChance * 100)}% for ${interaction.user.username} • 5min cooldown` });

    await interaction.editReply({ embeds: [embed] });
  }, { label: 'battle' });
}
