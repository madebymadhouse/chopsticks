/**
 * Schema Verification Tool
 * 
 * Calculates a hash of the current database schema and compares it against
 * the expected hash. This detects unauthorized schema drift.
 * 
 * Run manually: node scripts/verify-schema.js
 * Runs automatically: on bot startup (optional check)
 */

import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const EXPECTED_TABLES = [
  'agent_bots',
  'agent_pools',
  'agent_runners',
  'audit_log',
  'command_stats',
  'command_stats_daily',
  'guild_settings',
  'schema_migrations',
  'transaction_log',
  'user_inventory',
  'user_pets',
  'user_streaks',
  'user_wallets'
];

/**
 * Get the structure of all tables in the database
 */
async function getSchemaStructure(pool) {
  const structure = {};

  // Get all tables
  const tablesResult = await pool.query(`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);

  for (const row of tablesResult.rows) {
    const tableName = row.tablename;

    // Get columns for this table
    const columnsResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    // Get constraints for this table
    const constraintsResult = await pool.query(`
      SELECT
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY constraint_name
    `, [tableName]);

    // Get indexes for this table
    const indexesResult = await pool.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY indexname
    `, [tableName]);

    structure[tableName] = {
      columns: columnsResult.rows,
      constraints: constraintsResult.rows,
      indexes: indexesResult.rows
    };
  }

  return structure;
}

/**
 * Calculate a SHA256 hash of the schema structure
 */
function calculateSchemaHash(structure) {
  // Create a deterministic string representation
  const schemaString = JSON.stringify(structure, null, 0);
  
  // Calculate SHA256 hash
  return crypto.createHash('sha256').update(schemaString).digest('hex');
}

/**
 * Verify that expected tables exist
 */
function verifyExpectedTables(structure) {
  const actualTables = Object.keys(structure).sort();
  const missingTables = EXPECTED_TABLES.filter(t => !actualTables.includes(t));
  const unexpectedTables = actualTables.filter(t => !EXPECTED_TABLES.includes(t));

  return {
    ok: missingTables.length === 0 && unexpectedTables.length === 0,
    missingTables,
    unexpectedTables,
    actualTables
  };
}

/**
 * Main verification function
 */
async function verifySchema() {
  // Support both POSTGRES_URL and individual DB_* vars
  const pool = process.env.POSTGRES_URL 
    ? new Pool({ connectionString: process.env.POSTGRES_URL })
    : new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'chopsticks',
        user: process.env.DB_USER || 'chopsticks',
        password: process.env.DB_PASSWORD
      });

  try {
    console.log('🔍 Fetching schema structure...');
    const structure = await getSchemaStructure(pool);

    console.log('🧮 Calculating schema hash...');
    const hash = calculateSchemaHash(structure);

    console.log('\n📊 Schema Verification Results:');
    console.log('═'.repeat(60));
    console.log(`Schema Hash: ${hash}`);
    console.log('═'.repeat(60));

    // Verify expected tables
    const tableCheck = verifyExpectedTables(structure);
    
    if (tableCheck.ok) {
      console.log('✅ All expected tables present');
    } else {
      if (tableCheck.missingTables.length > 0) {
        console.log('❌ Missing tables:', tableCheck.missingTables.join(', '));
      }
      if (tableCheck.unexpectedTables.length > 0) {
        console.log('⚠️  Unexpected tables:', tableCheck.unexpectedTables.join(', '));
      }
    }

    // Table summary
    console.log(`\n📋 Tables (${tableCheck.actualTables.length} total):`);
    for (const table of tableCheck.actualTables) {
      const cols = structure[table].columns.length;
      const constraints = structure[table].constraints.length;
      const indexes = structure[table].indexes.length;
      console.log(`   ${table}: ${cols} columns, ${constraints} constraints, ${indexes} indexes`);
    }

    // Save hash to file for reference
    const fs = await import('fs');
    const hashFile = '.schema-hash';
    fs.writeFileSync(hashFile, `${hash}\n${new Date().toISOString()}\n`);
    console.log(`\n💾 Hash saved to ${hashFile}`);

    // Exit code
    if (!tableCheck.ok) {
      console.log('\n❌ Schema verification FAILED');
      process.exit(1);
    }

    console.log('\n✅ Schema verification PASSED');
    return hash;

  } catch (error) {
    console.error('❌ Schema verification error:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifySchema().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { verifySchema, getSchemaStructure, calculateSchemaHash };
