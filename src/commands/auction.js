// src/commands/auction.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { makeEmbed, Colors } from '../utils/discordOutput.js';
import { getWallet, addCredits, removeCredits } from '../economy/wallet.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { getPool } from '../utils/storage_pg.js';
import crypto from 'node:crypto';
import { botLogger } from '../utils/modernLogger.js';

export const meta = { category: 'economy', guildOnly: true };

export const data = new SlashCommandBuilder()
  .setName('auction')
  .setDescription('Auction house commands')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new auction')
      .addStringOption(o => o.setName('item').setDescription('Item name').setRequired(true))
      .addIntegerOption(o => o.setName('starting_bid').setDescription('Starting bid').setRequired(true).setMinValue(1))
      .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes (5–1440)').setRequired(true).setMinValue(5).setMaxValue(1440))
  )
  .addSubcommand(sub =>
    sub.setName('bid')
      .setDescription('Bid on the most recent active auction')
      .addIntegerOption(o => o.setName('amount').setDescription('Your bid amount').setRequired(true).setMinValue(1))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('Show all active auctions')
  )
  .addSubcommand(sub =>
    sub.setName('end')
      .setDescription('Admin: forcefully end an auction')
      .addStringOption(o => o.setName('id').setDescription('Auction ID').setRequired(true))
  );

// ── Pure helpers (exported for testing) ──────────────────────────────────────

export function getActiveAuctions(auctions) {
  const now = Date.now();
  return auctions.filter(a => a.active && new Date(a.end_time_iso).getTime() > now);
}

export function canCreateAuction(auctions) {
  return getActiveAuctions(auctions).length < 3;
}

export function isBidValid(auction, amount) {
  return Number.isFinite(amount) && Number.isInteger(amount) && amount > auction.current_bid;
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function fetchAuctions(guildId) {
  const pool = getPool();
  const res = await pool.query('SELECT data FROM guild_settings WHERE guild_id=$1', [guildId]);
  const d = res.rows[0]?.data ?? {};
  return Array.isArray(d.auctions) ? d.auctions : [];
}

async function persistAuctions(guildId, auctions) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO guild_settings(guild_id,data,rev) VALUES($1,$2::jsonb,1)
     ON CONFLICT(guild_id) DO UPDATE
       SET data = guild_settings.data || $2::jsonb,
           rev  = guild_settings.rev + 1`,
    [guildId, JSON.stringify({ auctions })]
  );
}

// ── Execute ───────────────────────────────────────────────────────────────────

export async function execute(interaction) {
  const sub     = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId  = interaction.user.id;

  try {
    // ── create ──────────────────────────────────────────────────────────────
    if (sub === 'create') {
      const item       = interaction.options.getString('item');
      const startBid   = interaction.options.getInteger('starting_bid');
      const duration   = interaction.options.getInteger('duration');
      const auctions   = await fetchAuctions(guildId);

      if (!canCreateAuction(auctions)) {
        return interaction.reply({
          embeds: [makeEmbed('Auction Limit', 'Max 3 active auctions per guild. End an existing one first.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const id      = crypto.randomUUID().slice(0, 8);
      const endTime = new Date(Date.now() + duration * 60 * 1000).toISOString();

      auctions.push({
        id,
        item,
        starting_bid:    startBid,
        current_bid:     startBid - 1, // first valid bid is exactly startBid
        current_bidder:  null,
        end_time_iso:    endTime,
        created_by:      userId,
        active:          true,
      });

      await persistAuctions(guildId, auctions);

      return interaction.reply({
        embeds: [makeEmbed(
          '🔨 Auction Created',
          `**${item}** is now up for auction!\nStarting bid: **${startBid}** credits\nEnds: <t:${Math.floor(new Date(endTime).getTime() / 1000)}:R>`,
          [{ name: 'Auction ID', value: id, inline: true }],
          null, null, Colors.SUCCESS
        )],
      });
    }

    // ── bid ─────────────────────────────────────────────────────────────────
    if (sub === 'bid') {
      const rl = await checkRateLimit(`auction:bid:${userId}`, 3, 60);
      if (!rl.ok) {
        return interaction.reply({
          embeds: [makeEmbed('Rate Limited', `Too many bids. Try again in ${rl.resetIn}s.`, [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const amount   = interaction.options.getInteger('amount');
      const auctions = await fetchAuctions(guildId);
      const active   = getActiveAuctions(auctions);

      if (active.length === 0) {
        return interaction.reply({
          embeds: [makeEmbed('No Active Auctions', 'There are no active auctions right now.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const auction = active[active.length - 1]; // most recent

      if (!isBidValid(auction, amount)) {
        return interaction.reply({
          embeds: [makeEmbed('Invalid Bid', `Your bid must exceed the current bid of **${auction.current_bid}** credits.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      if (auction.current_bidder === userId) {
        return interaction.reply({
          embeds: [makeEmbed('Already Leading', 'You are already the highest bidder!', [], null, null, Colors.WARNING)],
          ephemeral: true,
        });
      }

      const wallet = await getWallet(userId);
      if (Number(wallet.balance) < amount) {
        return interaction.reply({
          embeds: [makeEmbed('Insufficient Funds', `You need **${amount}** credits but only have **${wallet.balance}**.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      // Refund previous bidder first, then deduct new bid
      if (auction.current_bidder) {
        await addCredits(auction.current_bidder, auction.current_bid, 'auction:outbid-refund');
      }
      await removeCredits(userId, amount, 'auction:bid');

      const idx = auctions.findIndex(a => a.id === auction.id);
      auctions[idx].current_bid    = amount;
      auctions[idx].current_bidder = userId;
      await persistAuctions(guildId, auctions);

      return interaction.reply({
        embeds: [makeEmbed(
          '✅ Bid Placed',
          `You bid **${amount}** credits on **${auction.item}**!`,
          [{ name: 'Auction ID', value: auction.id, inline: true }],
          null, null, Colors.SUCCESS
        )],
      });
    }

    // ── list ────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const auctions = await fetchAuctions(guildId);
      const active   = getActiveAuctions(auctions);

      if (active.length === 0) {
        return interaction.reply({
          embeds: [makeEmbed('🔨 Auction House', 'No active auctions right now.', [], null, null, Colors.INFO)],
        });
      }

      const fields = active.map(a => ({
        name:   `${a.item} (ID: ${a.id})`,
        value:  `Current bid: **${a.current_bid}** | Ends: <t:${Math.floor(new Date(a.end_time_iso).getTime() / 1000)}:R>`,
        inline: false,
      }));

      return interaction.reply({
        embeds: [makeEmbed('🔨 Active Auctions', `${active.length} active auction(s)`, fields, null, null, Colors.INFO)],
      });
    }

    // ── end (admin) ─────────────────────────────────────────────────────────
    if (sub === 'end') {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          embeds: [makeEmbed('No Permission', 'You need Manage Server permission.', [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      const auctionId = interaction.options.getString('id');
      const auctions  = await fetchAuctions(guildId);
      const idx       = auctions.findIndex(a => a.id === auctionId && a.active);

      if (idx === -1) {
        return interaction.reply({
          embeds: [makeEmbed('Not Found', `No active auction with ID \`${auctionId}\`.`, [], null, null, Colors.ERROR)],
          ephemeral: true,
        });
      }

      auctions[idx].active = false;
      await persistAuctions(guildId, auctions);

      const a          = auctions[idx];
      const winnerText = a.current_bidder
        ? `Winner: <@${a.current_bidder}> with **${a.current_bid}** credits`
        : 'No bids were placed.';

      return interaction.reply({
        embeds: [makeEmbed(
          '🔨 Auction Ended',
          `**${a.item}** has been ended.\n${winnerText}`,
          [], null, null, Colors.SUCCESS
        )],
      });
    }

  } catch (err) {
    botLogger.error({ err }, '[auction] Error');
    const replied = interaction.replied || interaction.deferred;
    await interaction[replied ? 'editReply' : 'reply']({
      embeds: [makeEmbed('Error', 'An error occurred.', [], null, null, Colors.ERROR)],
      ephemeral: true,
    });
  }
}
