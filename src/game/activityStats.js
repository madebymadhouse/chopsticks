// src/game/activityStats.js
// Per-guild activity stat tracking. Fire-and-forget safe — all errors are swallowed.

import { addGuildStat, getGuildStats, getGuildLeaderboard, getGuildXpLeaderboard } from '../utils/storage.js';

export const STAT_FIELDS = [
  'vc_minutes', 'vc_sessions', 'messages_sent', 'credits_earned', 'credits_spent',
  'trades_completed', 'items_sold', 'work_runs', 'gather_runs', 'fight_wins',
  'trivia_wins', 'trivia_runs', 'heist_runs', 'casino_wins', 'agent_actions_used', 'commands_used',
];

export const LEADERBOARD_FIELDS = {
  vc: 'vc_minutes',
  messages: 'messages_sent',
  credits: 'credits_earned',
  work: 'work_runs',
  gather: 'gather_runs',
  fights: 'fight_wins',
  trivia: 'trivia_wins',
  commands: 'commands_used',
  agent_actions: 'agent_actions_used',
};

export const FIELD_LABELS = {
  vc_minutes: '🎙️ VC Time (min)',
  messages_sent: '💬 Messages',
  credits_earned: '💰 Credits Earned',
  credits_spent: '🛒 Credits Spent',
  trades_completed: '🤝 Trades',
  items_sold: '🏪 Items Sold',
  work_runs: '💼 Work Runs',
  gather_runs: '⛏️ Gather Runs',
  fight_wins: '⚔️ Fight Wins',
  trivia_wins: '🧠 Trivia Wins',
  trivia_runs: '🎯 Trivia Played',
  heist_runs: '🏦 Heists',
  casino_wins: '🎰 Casino Wins',
  agent_actions_used: '🤖 Agent Actions',
  commands_used: '⌨️ Commands Used',
};

/**
 * Increment a stat for a user in a guild. Fire-and-forget.
 * @param {string} userId
 * @param {string|null} guildId
 * @param {string} field  - one of STAT_FIELDS
 * @param {number} amount - defaults to 1
 */
export function addStat(userId, guildId, field, amount = 1) {
  if (!userId || !guildId) return;
  addGuildStat(userId, guildId, field, amount).catch(() => {});
}

/**
 * Get all stats for a user in a guild.
 * @returns {Promise<object|null>}
 */
export async function getStat(userId, guildId) {
  if (!userId || !guildId) return null;
  return getGuildStats(userId, guildId).catch(() => null);
}

/**
 * Get paginated leaderboard for a guild.
 * @param {string} guildId
 * @param {string} fieldOrAlias  - field name or alias (e.g. 'vc', 'messages')
 * @param {number} limit
 * @param {number} offset
 * @returns {Promise<Array<{user_id: string, value: bigint}>>}
 */
export async function getLeaderboard(guildId, fieldOrAlias, limit = 10, offset = 0) {
  if (!guildId) return [];
  const field = LEADERBOARD_FIELDS[fieldOrAlias] || fieldOrAlias;
  if (field === 'xp' || field === 'level') {
    return getGuildXpLeaderboard(guildId, limit, offset).catch(() => []);
  }
  return getGuildLeaderboard(guildId, field, limit, offset).catch(() => []);
}
