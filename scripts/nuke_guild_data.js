#!/usr/bin/env node
/**
 * scripts/nuke_guild_data.js
 *
 * DESTRUCTIVE — wipes all guild and user data from the database.
 * Preserves agent infrastructure (agent_bots, agent_pools, agent_runners)
 * and achievement definitions.
 *
 * Usage:
 *   INITIAL_DATA_WIPE=true node scripts/nuke_guild_data.js
 *
 * Or, to also wipe economy/user data (full nuke):
 *   INITIAL_DATA_WIPE=true NUKE_USER_DATA=true node scripts/nuke_guild_data.js
 *
 * Can also be imported and called programmatically by a migration.
 */

import pg from "pg";
import { createInterface } from "readline";

const { Pool } = pg;

// Tables to always wipe (guild configs, XP, activity)
const GUILD_TABLES = [
  "guild_settings",
  "guild_xp_config",
  "user_guild_xp",
  "user_guild_stats",
  "user_command_stats",
  "command_stats",
  "command_stats_daily",
  "audit_log",
  "guild_agent_actions",
  "agent_action_uses",
  "pool_contributions",
  "pool_reviews",
];

// Tables to wipe only if NUKE_USER_DATA=true
const USER_TABLES = [
  "user_wallets",
  "user_game_profiles",
  "user_inventory",
  "user_achievements",
  "user_daily_quests",
  "user_streaks",
  "user_collections",
  "user_level_rewards",
  "user_pets",
  "user_profile_privacy",
  "transaction_log",
];

// NEVER wiped (infrastructure)
const PRESERVED = [
  "agent_bots",
  "agent_pools",
  "agent_runners",
  "achievements", // achievement definitions (not user data)
];

async function confirm(question) {
  if (process.env.FORCE_YES === "true") return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${question} [yes/NO]: `, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

async function main() {
  if (process.env.INITIAL_DATA_WIPE !== "true") {
    console.error("❌ Set INITIAL_DATA_WIPE=true to proceed.");
    console.error("   This script PERMANENTLY wipes guild and user data.");
    process.exit(1);
  }

  const nukeUserData = process.env.NUKE_USER_DATA === "true";
  const tables = nukeUserData ? [...GUILD_TABLES, ...USER_TABLES] : [...GUILD_TABLES];

  console.log("\n⚠️  CHOPSTICKS DATA WIPE");
  console.log("━".repeat(50));
  console.log(`Tables to wipe (${tables.length}):`);
  tables.forEach(t => console.log(`  • ${t}`));
  console.log("\nPreserved (untouched):");
  PRESERVED.forEach(t => console.log(`  ✅ ${t}`));

  if (!nukeUserData) {
    console.log("\nℹ️  Pass NUKE_USER_DATA=true to also wipe wallet/economy/profile data.");
  }

  console.log("");
  const ok = await confirm("Type YES to proceed with wipe");
  if (!ok) {
    console.log("Aborted.");
    process.exit(0);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const table of tables) {
      try {
        const res = await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
        console.log(`  ✅ Wiped: ${table}`);
      } catch (err) {
        if (err.code === "42P01") {
          // table doesn't exist — skip
          console.log(`  ⏭  Skipped (not found): ${table}`);
        } else {
          throw err;
        }
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Data wipe complete.");
    console.log("The bot will start fresh — as if no guilds have configured it yet.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Wipe failed — rolled back:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
