// src/utils/migrations/runner.js
// Migration runner for Level 1: Invariants Locked
// Ensures all schema changes are tracked, versioned, and backward-compatible

import { getPool } from '../storage_pg.js';
import { logger } from '../logger.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migration table schema
async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      checksum TEXT NOT NULL,
      execution_time_ms INTEGER
    );
  `);
}

// Calculate checksum of migration file
function calculateChecksum(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get list of all migration files
async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '../../../migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(f => f.endsWith('.js') && !f.startsWith('_'))
      .sort(); // Lexicographic sort ensures chronological order
    
    return migrationFiles;
  } catch (err) {
    if (err.code === 'ENOENT') {
      logger.info('Migrations directory not found, skipping migrations');
      return [];
    }
    throw err;
  }
}

// Get list of applied migrations from database
async function getAppliedMigrations(pool) {
  const result = await pool.query(`
    SELECT version, checksum 
    FROM schema_migrations 
    ORDER BY version ASC
  `);
  
  return new Map(result.rows.map(r => [r.version, r.checksum]));
}

// Run a single migration
async function runMigration(pool, migrationPath, migrationFile) {
  const startTime = Date.now();
  
  // Extract version from filename (YYYYMMDD_HHMMSS)
  const versionMatch = migrationFile.match(/^(\d{8}_\d{6})/);
  if (!versionMatch) {
    throw new Error(`Invalid migration filename format: ${migrationFile}`);
  }
  const version = versionMatch[1];
  
  // Read file content for checksum
  const content = await fs.readFile(migrationPath, 'utf8');
  const checksum = calculateChecksum(content);
  
  // Import migration module
  const migration = await import(`file://${migrationPath}`);
  const migrationDef = migration.default;
  
  if (!migrationDef || typeof migrationDef.up !== 'function') {
    throw new Error(`Migration ${migrationFile} missing up() function`);
  }
  
  const description = migrationDef.description || 'No description';
  
  logger.info(`Running migration ${version}: ${description}`);
  
  // Run migration in a transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Run the migration
    await migrationDef.up(client);
    
    // Record migration as applied
    await client.query(`
      INSERT INTO schema_migrations (version, description, checksum, execution_time_ms)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (version) DO UPDATE SET
        applied_at = NOW(),
        execution_time_ms = EXCLUDED.execution_time_ms
    `, [version, description, checksum, Date.now() - startTime]);
    
    await client.query('COMMIT');
    
    const executionTime = Date.now() - startTime;
    logger.info(`✅ Migration ${version} completed in ${executionTime}ms`);
    
    return { version, description, executionTime };
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`❌ Migration ${version} failed:`, { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

// Verify checksums of applied migrations
async function verifyMigrationIntegrity(pool, migrationsDir) {
  const applied = await getAppliedMigrations(pool);
  const files = await getMigrationFiles();
  
  const errors = [];
  
  for (const file of files) {
    const versionMatch = file.match(/^(\d{8}_\d{6})/);
    if (!versionMatch) continue;
    
    const version = versionMatch[1];
    const storedChecksum = applied.get(version);
    
    if (storedChecksum) {
      // Migration was applied, verify checksum
      const migrationPath = path.join(migrationsDir, file);
      const content = await fs.readFile(migrationPath, 'utf8');
      const currentChecksum = calculateChecksum(content);
      
      if (currentChecksum !== storedChecksum) {
        errors.push({
          version,
          file,
          error: 'Checksum mismatch - migration file was modified after being applied'
        });
      }
    }
  }
  
  return errors;
}

// Main migration runner
export async function runMigrations() {
  const pool = getPool();
  
  try {
    // Ensure migrations table exists
    await ensureMigrationsTable(pool);
    
    // Get list of migrations
    const migrationsDir = path.join(__dirname, '../../../migrations');
    const files = await getMigrationFiles();
    
    if (files.length === 0) {
      logger.info('No migrations found');
      return { applied: 0, pending: 0, errors: [] };
    }
    
    // Verify integrity of applied migrations
    const integrityErrors = await verifyMigrationIntegrity(pool, migrationsDir);
    if (integrityErrors.length > 0) {
      logger.error('❌ Migration integrity check failed:');
      for (const err of integrityErrors) {
        logger.error(`  ${err.version}: ${err.error}`);
      }
      throw new Error('Migration integrity check failed. Halting to prevent data corruption.');
    }
    
    // Get applied migrations
    const applied = await getAppliedMigrations(pool);
    
    // Run pending migrations
    const results = [];
    for (const file of files) {
      const versionMatch = file.match(/^(\d{8}_\d{6})/);
      if (!versionMatch) {
        logger.warn(`Skipping invalid migration filename: ${file}`);
        continue;
      }
      
      const version = versionMatch[1];
      
      if (!applied.has(version)) {
        const migrationPath = path.join(migrationsDir, file);
        const result = await runMigration(pool, migrationPath, file);
        results.push(result);
      }
    }
    
    if (results.length > 0) {
      logger.info(`✅ Applied ${results.length} migration(s)`);
    } else {
      logger.info('✅ All migrations up to date');
    }
    
    return {
      applied: results.length,
      pending: 0,
      errors: [],
      migrations: results
    };
  } catch (err) {
    logger.error('Migration runner failed:', { error: err.message });
    throw err;
  }
}

// Get migration status
export async function getMigrationStatus() {
  const pool = getPool();
  
  await ensureMigrationsTable(pool);
  
  const files = await getMigrationFiles();
  const applied = await getAppliedMigrations(pool);
  
  const status = files.map(file => {
    const versionMatch = file.match(/^(\d{8}_\d{6})/);
    if (!versionMatch) return null;
    
    const version = versionMatch[1];
    const isApplied = applied.has(version);
    
    return {
      version,
      file,
      applied: isApplied,
      checksum: applied.get(version) || null
    };
  }).filter(Boolean);
  
  return {
    total: status.length,
    applied: status.filter(s => s.applied).length,
    pending: status.filter(s => !s.applied).length,
    migrations: status
  };
}
