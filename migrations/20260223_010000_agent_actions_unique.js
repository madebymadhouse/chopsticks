// Add UNIQUE constraint on guild_agent_actions(guild_id, action_type)
// This prevents duplicate rows when admins enable the same action multiple times.

export default {
  version: '20260223_010000',
  description: 'Add unique index on guild_agent_actions(guild_id, action_type)',

  async up(client) {
    // Deduplicate first: keep the most recently created row per (guild_id, action_type)
    await client.query(`
      DELETE FROM guild_agent_actions
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY guild_id, action_type
              ORDER BY created_at DESC
            ) AS rn
          FROM guild_agent_actions
        ) ranked
        WHERE rn > 1
      )
    `);

    // Now safe to create the unique index
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_actions_unique
      ON guild_agent_actions(guild_id, action_type)
    `);
  },

  async down(client) {
    await client.query(`DROP INDEX IF EXISTS idx_agent_actions_unique`);
  },
};
