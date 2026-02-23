/**
 * Per-guild stats engine tests
 * Tests activityStats, guildXp, and achievements modules (pure logic only — no DB).
 */

import assert from 'assert';
import { STAT_FIELDS, FIELD_LABELS, LEADERBOARD_FIELDS } from '../../src/game/activityStats.js';
import { ACHIEVEMENT_DEFS } from '../../src/game/achievements.js';

describe('activityStats', function () {
  describe('STAT_FIELDS', function () {
    it('should contain all expected tracked fields', function () {
      const expected = ['vc_minutes', 'messages_sent', 'work_runs', 'fight_wins', 'trivia_wins', 'agent_actions_used', 'commands_used'];
      for (const f of expected) {
        assert(STAT_FIELDS.includes(f), `STAT_FIELDS missing: ${f}`);
      }
    });

    it('should have labels for every leaderboard field', function () {
      for (const [alias, field] of Object.entries(LEADERBOARD_FIELDS)) {
        if (field !== 'xp' && field !== 'level') {
          assert(FIELD_LABELS[field], `Missing FIELD_LABELS entry for ${field} (alias: ${alias})`);
        }
      }
    });
  });

  describe('addStat (smoke)', function () {
    it('should not throw when called with null guildId', async function () {
      // addStat is fire-and-forget; with null guild it should silently return
      const { addStat } = await import('../../src/game/activityStats.js');
      assert.doesNotThrow(() => addStat('user1', null, 'work_runs', 1));
    });

    it('should not throw when called with invalid field', async function () {
      const { addStat } = await import('../../src/game/activityStats.js');
      assert.doesNotThrow(() => addStat('user1', 'guild1', 'invalid_field', 1));
    });
  });
});

describe('achievements', function () {
  describe('ACHIEVEMENT_DEFS', function () {
    it('should have at least 40 achievement definitions', function () {
      assert(ACHIEVEMENT_DEFS.length >= 40, `Only ${ACHIEVEMENT_DEFS.length} achievement defs — expected 40+`);
    });

    it('should have unique IDs', function () {
      const ids = ACHIEVEMENT_DEFS.map(d => d.id);
      const unique = new Set(ids);
      assert.strictEqual(unique.size, ids.length, 'Duplicate achievement IDs found');
    });

    it('every achievement should have required fields', function () {
      const required = ['id', 'name', 'description', 'emoji', 'category', 'rarity'];
      for (const def of ACHIEVEMENT_DEFS) {
        for (const f of required) {
          assert(def[f], `Achievement ${def.id || '?'} missing field: ${f}`);
        }
      }
    });

    it('rarity values should be valid', function () {
      const valid = new Set(['common', 'rare', 'epic', 'legendary']);
      for (const def of ACHIEVEMENT_DEFS) {
        assert(valid.has(def.rarity), `Achievement ${def.id} has invalid rarity: ${def.rarity}`);
      }
    });

    it('categories should cover VC, economy, gaming, social, agent, bot areas', function () {
      const categories = new Set(ACHIEVEMENT_DEFS.map(d => d.category));
      for (const expected of ['vc', 'economy', 'gaming', 'social', 'agent', 'bot']) {
        assert(categories.has(expected), `Missing achievement category: ${expected}`);
      }
    });

    it('xp_reward and credit_reward should be non-negative numbers', function () {
      for (const def of ACHIEVEMENT_DEFS) {
        assert(typeof def.xp_reward === 'number' && def.xp_reward >= 0, `Achievement ${def.id} has invalid xp_reward`);
        assert(typeof def.credit_reward === 'number' && def.credit_reward >= 0, `Achievement ${def.id} has invalid credit_reward`);
      }
    });
  });

  describe('getAchievementDef', function () {
    it('should return the correct definition by ID', async function () {
      const { getAchievementDef } = await import('../../src/game/achievements.js');
      const def = getAchievementDef('vc_first');
      assert(def, 'Should find vc_first');
      assert.strictEqual(def.id, 'vc_first');
      assert.strictEqual(def.category, 'vc');
    });

    it('should return null for unknown ID', async function () {
      const { getAchievementDef } = await import('../../src/game/achievements.js');
      const def = getAchievementDef('nonexistent_achievement');
      assert.strictEqual(def, null);
    });
  });
});

describe('guildXp', function () {
  describe('addGuildXp (smoke)', function () {
    it('should return null when userId is missing', async function () {
      const { addGuildXp } = await import('../../src/game/guildXp.js');
      const result = await addGuildXp(null, 'guild1', 'message');
      assert.strictEqual(result, null);
    });

    it('should return null when guildId is missing', async function () {
      const { addGuildXp } = await import('../../src/game/guildXp.js');
      const result = await addGuildXp('user1', null, 'message');
      assert.strictEqual(result, null);
    });
  });
});
