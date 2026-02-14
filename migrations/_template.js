// Migration Template
// Copy this file and rename with format: YYYYMMDD_HHMMSS_description.js
// Example: 20260214_120000_add_user_preferences.js

export default {
  // Version extracted from filename, but specify here for clarity
  version: 'YYYYMMDD_HHMMSS',
  
  // Brief description of what this migration does
  description: 'Add user preferences table',
  
  // Run the migration
  async up(client) {
    // Example: Add a new table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        preferences JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    
    // Example: Add a new column to existing table
    await client.query(`
      ALTER TABLE guild_settings
      ADD COLUMN IF NOT EXISTS new_column TEXT DEFAULT 'default_value';
    `);
    
    // Example: Create an index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_prefs_updated
      ON user_preferences(updated_at);
    `);
  },
  
  // Optional: Rollback (not used in Level 1, but here for reference)
  async down(client) {
    // Level 1 does not support rollback
    // For backward-compatible migrations, down() is usually empty
    // or simply removes additive changes
  }
};
