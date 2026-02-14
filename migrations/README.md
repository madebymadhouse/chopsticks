# Database Migrations

This directory contains versioned database migrations for the Chopsticks platform.

## Migration System (Level 1: Invariants Locked)

### Principles

1. **Backward Compatible Only** - All migrations must be backward compatible
2. **Versioned** - Each migration has a sequential version number
3. **Idempotent** - Migrations can be run multiple times safely
4. **Atomic** - Each migration runs in a transaction
5. **Tracked** - Applied migrations are recorded in `schema_migrations` table

### Migration Naming Convention

```
YYYYMMDD_HHMMSS_description.js
```

Example: `20260214_120000_add_protocol_version.js`

### Migration Structure

```javascript
export default {
  version: '20260214_120000',
  description: 'Add protocol version field',
  
  async up(pool) {
    await pool.query(`
      ALTER TABLE agent_bots
      ADD COLUMN IF NOT EXISTS protocol_version TEXT;
    `);
  },
  
  async down(pool) {
    // Backward-compatible migrations often don't need a down()
    // because they use ADD COLUMN IF NOT EXISTS
    // Down migrations are optional for additive changes
  }
};
```

### Rules for Level 1

1. **No Breaking Changes**
   - Never drop columns
   - Never rename columns
   - Never change column types in incompatible ways
   - Use `ADD COLUMN IF NOT EXISTS`
   - Use `CREATE TABLE IF NOT EXISTS`

2. **Always Additive**
   - Add columns with defaults
   - Add tables (not replace)
   - Add indexes
   - Add constraints (with validation after data migration)

3. **Data Migrations**
   - Must handle existing data gracefully
   - Must be idempotent (can run multiple times)
   - Must not corrupt data on failure

4. **Testing**
   - Each migration must have a test
   - Test on clean database
   - Test on database with existing data
   - Test migration can be run twice

### Running Migrations

Migrations run automatically on bot startup. To run manually:

```bash
# Run all pending migrations
node src/utils/migrations/runner.js

# Check migration status
node src/utils/migrations/status.js
```
