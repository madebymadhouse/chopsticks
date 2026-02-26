// src/commands/trade.js
import { SlashCommandBuilder } from 'discord.js';
import { makeEmbed, Colors } from '../utils/discordOutput.js';
import { getWallet, transferCredits } from '../economy/wallet.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { getPool } from '../utils/storage_pg.js';
import crypto from 'node:crypto';
import { botLogger } from "../utils/modernLogger.js";

export const meta = {
  deployGlobal: false, category: 'economy', guildOnly: true };

export const data = new SlashCommandBuilder()
  .setName('trade')
  .setDescription('Trade coins and items with other users')
  .addSubcommand(sub =>
    sub.setName('offer')
      .setDescription('Offer a trade to another user')
      .addUserOption(o => o.setName('target').setDescription('User to trade with').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('Credits to send').setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName('item').setDescription('Optional item description').setRequired(false))
  )
  .addSubcommand(sub =>
    sub.setName('accept')
      .setDescription('Accept a pending trade')
      .addStringOption(o => o.setName('id').setDescription('Trade ID').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('cancel')
      .setDescription('Cancel your own pending trade')
      .addStringOption(o => o.setName('id').setDescription('Trade ID').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show your pending trades')
  );

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export function validateTradeRequest(fromId, toId, amount, toBot = false) {
  if (fromId === toId)                        return { ok: false, reason: 'self' };
  if (toBot)                                  return { ok: false, reason: 'bot' };
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, reason: 'amount' };
  return { ok: true };
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function fetchTrades(guildId) {
  const pool = getPool();
  const res  = await pool.query('SELECT data FROM guild_settings WHERE guild_id=$1', [guildId]);
  const d    = res.rows[0]?.data ?? {};
  return Array.isArray(d.trades) ? d.trades : [];
}

async function persistTrades(guildId, trades) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO guild_settings(guild_id,data,rev) VALUES($1,$2::jsonb,1)
     ON CONFLICT(guild_id) DO UPDATE
       SET data = guild_settings.data || $2::jsonb,
           rev  = guild_settings.rev + 1`,
    [guildId, JSON.stringify({ trades })]
  );
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function execute(interaction) {
  const sub     = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;

  try {
    // ── offer ────────────────────────────────────────────────────────────────
    if (sub === 'offer') {
      const rl = await checkRateLimit(`trade:offer:${userId}`, 3, 60);
      if (!rl.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Rate Limited', `Too many trade offers. Try again in ${rl.resetIn}s.`, [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const target = interaction.options.getUser('target');
      const amount = interaction.options.getInteger('amount');
      const item   = interaction.options.getString('item') ?? null;

      const v = validateTradeRequest(userId, target.id, amount, target.bot);
      if (!v.ok) {
        const msgs = {
          self:   'You cannot trade with yourself.',
          bot:    'You cannot trade with bots.',
          amount: 'Amount must be a positive integer.',
        };
        return interaction.reply({
          embeds: [makeEmbed('Invalid Trade', msgs[v.reason] ?? 'Invalid trade.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const wallet = await getWallet(userId);
      if (Number(wallet.balance) < amount) {
        return interaction.reply({
          embeds: [makeEmbed('Insufficient Funds', `You only have **${wallet.balance}** credits.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const trades    = await fetchTrades(guildId);
      const id        = crypto.randomUUID().slice(0, 8);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      trades.push({
        id,
        from_user:  userId,
        to_user:    target.id,
        amount,
        item,
        status:     'pending',
        expires_at: expiresAt,
      });

      await persistTrades(guildId, trades);

      const fields = [
        { name: 'Trade ID',  value: id,                        inline: true },
        { name: 'Amount',    value: `${amount} credits`,       inline: true },
        { name: 'Expires',   value: `<t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:R>`, inline: true },
      ];
      if (item) fields.push({ name: 'Item', value: item, inline: false });

      return interaction.reply({
        embeds: [makeEmbed(
          '🤝 Trade Offer Sent',
          `You offered **${amount}** credits to <@${target.id}>. They have 5 minutes to accept.`,
          fields, null, null, Colors.SUCCESS
        )],
      });
    }

    // ── accept ───────────────────────────────────────────────────────────────
    if (sub === 'accept') {
      const tradeId = interaction.options.getString('id');
      const trades  = await fetchTrades(guildId);
      const now     = Date.now();
      const idx     = trades.findIndex(
        t => t.id === tradeId && t.status === 'pending' && new Date(t.expires_at).getTime() > now
      );

      if (idx === -1) {
        return interaction.reply({
          embeds: [makeEmbed('Not Found', `No pending trade with ID \`${tradeId}\`.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const trade = trades[idx];
      if (trade.to_user !== userId) {
        return interaction.reply({
          embeds: [makeEmbed('Not Your Trade', 'Only the recipient can accept this trade.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const result = await transferCredits(trade.from_user, trade.to_user, trade.amount, 'trade');
      if (!result.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Transfer Failed', result.reason === 'insufficient' ? 'The sender no longer has enough credits.' : 'Transfer failed.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      trades[idx].status = 'accepted';
      await persistTrades(guildId, trades);

      void (async () => {
        try {
          const { addStat } = await import('../game/activityStats.js');
          addStat(trade.to_user, guildId, 'trades_completed', 1);
          addStat(trade.from_user, guildId, 'trades_completed', 1);
          addStat(trade.to_user, guildId, 'credits_earned', trade.amount);
          addStat(trade.from_user, guildId, 'credits_spent', trade.amount);
        } catch {}
      })();

      return interaction.reply({
        embeds: [makeEmbed(
          '✅ Trade Accepted',
          `You received **${trade.amount}** credits from <@${trade.from_user}>!${trade.item ? `\nItem: ${trade.item}` : ''}`,
          [], null, null, Colors.SUCCESS
        )],
      });
    }

    // ── cancel ───────────────────────────────────────────────────────────────
    if (sub === 'cancel') {
      const tradeId = interaction.options.getString('id');
      const trades  = await fetchTrades(guildId);
      const idx     = trades.findIndex(t => t.id === tradeId && t.status === 'pending');

      if (idx === -1) {
        return interaction.reply({
          embeds: [makeEmbed('Not Found', `No pending trade with ID \`${tradeId}\`.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      if (trades[idx].from_user !== userId) {
        return interaction.reply({
          embeds: [makeEmbed('Not Your Trade', 'You can only cancel your own trades.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      trades[idx].status = 'cancelled';
      await persistTrades(guildId, trades);

      return interaction.reply({
        embeds: [makeEmbed('❌ Trade Cancelled', `Trade \`${tradeId}\` has been cancelled.`, [], null, null, Colors.SUCCESS)],
      });
    }

    // ── list ─────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const trades = await fetchTrades(guildId);
      const now    = Date.now();
      const active = trades.filter(
        t => t.status === 'pending' && new Date(t.expires_at).getTime() > now &&
          (t.from_user === userId || t.to_user === userId)
      );

      if (active.length === 0) {
        return interaction.reply({
          embeds: [makeEmbed('🤝 Your Trades', 'No pending trades.', [], null, null, Colors.INFO)],
        });
      }

      const fields = active.map(t => ({
        name:  `ID: ${t.id}`,
        value: `${t.from_user === userId ? '→ Outgoing to' : '← Incoming from'} <@${t.from_user === userId ? t.to_user : t.from_user}> — **${t.amount}** credits | Expires: <t:${Math.floor(new Date(t.expires_at).getTime() / 1000)}:R>`,
        inline: false,
      }));

      return interaction.reply({
        embeds: [makeEmbed('🤝 Your Trades', `${active.length} pending trade(s)`, fields, null, null, Colors.INFO)],
      });
    }

  } catch (err) {
    botLogger.error({ err: err }, '[trade] Error:');
    const replied = interaction.replied || interaction.deferred;
    await interaction[replied ? 'editReply' : 'reply']({
      embeds: [makeEmbed('Error', 'An error occurred.', [], null, null, Colors.ERROR)],
      ephemeral: true,
    });
  }
}
