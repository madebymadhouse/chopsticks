// src/commands/casino.js
import { SlashCommandBuilder } from 'discord.js';
import { makeEmbed, Colors } from '../utils/discordOutput.js';
import { getWallet, addCredits, removeCredits } from '../economy/wallet.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { botLogger } from "../utils/modernLogger.js";

export const meta = {
  deployGlobal: false, category: 'economy', guildOnly: true };

export const data = new SlashCommandBuilder()
  .setName('casino')
  .setDescription('Casino games — gamble your credits!')
  .addSubcommand(sub =>
    sub.setName('slots')
      .setDescription('Spin the slot machine (bet 10–1000)')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10).setMaxValue(1000))
  )
  .addSubcommand(sub =>
    sub.setName('coinflip')
      .setDescription('Flip a coin for double-or-nothing (bet 10–500)')
      .addIntegerOption(o => o.setName('bet').setDescription('Amount to bet').setRequired(true).setMinValue(10).setMaxValue(500))
      .addStringOption(o =>
        o.setName('side')
          .setDescription('heads or tails')
          .setRequired(true)
          .addChoices(
            { name: 'Heads', value: 'heads' },
            { name: 'Tails', value: 'tails' }
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('balance')
      .setDescription('Show your current credit balance')
  );

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export const SLOT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎'];

/**
 * Calculate slots payout.
 * @param {string[]} symbols - array of 3 symbols
 * @param {number}   bet     - wager amount
 * @returns {number} total winnings (0 if loss)
 */
export function calcSlotsPayout(symbols, bet) {
  if (!Array.isArray(symbols) || symbols.length !== 3) return 0;
  const [a, b, c] = symbols;
  if (a === b && b === c) {
    if (a === '💎') return bet * 50;
    if (a === '⭐') return bet * 20;
    return bet * 5;
  }
  if (a === b || b === c || a === c) return Math.floor(bet * 1.5);
  return 0;
}

/**
 * Validate a bet amount against a range.
 * @param {number} amount
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function validateBet(amount, min, max) {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount >= min && amount <= max;
}

export function isValidCoinSide(side) {
  return side === 'heads' || side === 'tails';
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function execute(interaction) {
  const sub    = interaction.options.getSubcommand();
  const userId = interaction.user.id;

  try {
    // ── slots ────────────────────────────────────────────────────────────────
    if (sub === 'slots') {
      const rl = await checkRateLimit(`casino:${userId}`, 5, 30);
      if (!rl.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Slow Down!', `Too many games. Try again in ${rl.resetIn}s.`, [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const bet = interaction.options.getInteger('bet');
      if (!validateBet(bet, 10, 1000)) {
        return interaction.reply({
          embeds: [makeEmbed('Invalid Bet', 'Bet must be between 10 and 1000 credits.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const wallet = await getWallet(userId);
      if (Number(wallet.balance) < bet) {
        return interaction.reply({
          embeds: [makeEmbed('Insufficient Funds', `You need **${bet}** credits but only have **${wallet.balance}**.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      await removeCredits(userId, bet, 'casino:slots:bet');

      const spin    = [0, 1, 2].map(() => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
      const payout  = calcSlotsPayout(spin, bet);

      if (payout > 0) {
        await addCredits(userId, payout, 'casino:slots:win');
        void (async () => {
          try {
            const { addStat } = await import('../game/activityStats.js');
            addStat(userId, interaction.guildId, 'casino_wins', 1);
            addStat(userId, interaction.guildId, 'credits_earned', payout);
          } catch {}
        })();
      }

      const net      = payout - bet;
      const newWallet = await getWallet(userId);
      const resultLine = payout > 0
        ? `🎉 You won **${payout}** credits! (net: +${net})`
        : `😢 No match — you lost **${bet}** credits.`;

      return interaction.reply({
        embeds: [makeEmbed(
          '🎰 Slot Machine',
          `${spin.join(' | ')}\n\n${resultLine}`,
          [{ name: 'Balance', value: `${newWallet.balance.toLocaleString()} credits`, inline: true }],
          null, null,
          payout > 0 ? Colors.SUCCESS : Colors.ERROR
        )],
      });
    }

    // ── coinflip ─────────────────────────────────────────────────────────────
    if (sub === 'coinflip') {
      const rl = await checkRateLimit(`casino:${userId}`, 5, 30);
      if (!rl.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Slow Down!', `Too many games. Try again in ${rl.resetIn}s.`, [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const bet  = interaction.options.getInteger('bet');
      const side = interaction.options.getString('side');

      if (!validateBet(bet, 10, 500)) {
        return interaction.reply({
          embeds: [makeEmbed('Invalid Bet', 'Bet must be between 10 and 500 credits.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      if (!isValidCoinSide(side)) {
        return interaction.reply({
          embeds: [makeEmbed('Invalid Side', 'Choose either `heads` or `tails`.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const wallet = await getWallet(userId);
      if (Number(wallet.balance) < bet) {
        return interaction.reply({
          embeds: [makeEmbed('Insufficient Funds', `You need **${bet}** credits but only have **${wallet.balance}**.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      await removeCredits(userId, bet, 'casino:coinflip:bet');

      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won    = result === side;

      if (won) {
        await addCredits(userId, bet * 2, 'casino:coinflip:win');
      }

      const newWallet = await getWallet(userId);

      return interaction.reply({
        embeds: [makeEmbed(
          `🪙 Coin Flip — ${result.charAt(0).toUpperCase() + result.slice(1)}!`,
          won
            ? `You picked **${side}** — correct! You won **${bet * 2}** credits! (net: +${bet})`
            : `You picked **${side}** — wrong! You lost **${bet}** credits.`,
          [{ name: 'Balance', value: `${newWallet.balance.toLocaleString()} credits`, inline: true }],
          null, null,
          won ? Colors.SUCCESS : Colors.ERROR
        )],
      });
    }

    // ── balance ──────────────────────────────────────────────────────────────
    if (sub === 'balance') {
      const wallet = await getWallet(userId);
      return interaction.reply({
        embeds: [makeEmbed(
          '💰 Your Balance',
          `You have **${wallet.balance.toLocaleString()}** credits in your wallet.`,
          [{ name: '🏦 Bank', value: `${wallet.bank.toLocaleString()} / ${wallet.bank_capacity.toLocaleString()}`, inline: true }],
          null, null, Colors.INFO
        )],
      });
    }

  } catch (err) {
    botLogger.error({ err: err }, '[casino] Error:');
    const replied = interaction.replied || interaction.deferred;
    await interaction[replied ? 'editReply' : 'reply']({
      embeds: [makeEmbed('Error', 'An error occurred.', [], null, null, Colors.ERROR)],
      ephemeral: true,
    });
  }
}
