export default {
  description: "Add guild scripting tables with versioning and audit logs",
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_scripts (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        script_id TEXT NOT NULL,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'command',
        trigger_value TEXT,
        definition JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        current_version INTEGER NOT NULL DEFAULT 1,
        created_by TEXT NOT NULL,
        updated_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_guild_scripts_script UNIQUE (guild_id, script_id),
        CONSTRAINT uq_guild_scripts_name UNIQUE (guild_id, name),
        CONSTRAINT ck_guild_scripts_trigger CHECK (trigger_type IN ('command', 'schedule', 'event'))
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_script_versions (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        script_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        definition JSONB NOT NULL,
        created_by TEXT NOT NULL,
        change_note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_guild_script_versions UNIQUE (guild_id, script_id, version)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS guild_script_audit (
        id BIGSERIAL PRIMARY KEY,
        guild_id TEXT NOT NULL,
        script_id TEXT NOT NULL,
        actor_user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_guild_scripts_guild ON guild_scripts(guild_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guild_scripts_trigger ON guild_scripts(guild_id, trigger_type, is_active);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guild_script_versions_guild ON guild_script_versions(guild_id, script_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_guild_script_audit_guild ON guild_script_audit(guild_id, script_id, id DESC);`);
  }
};

