import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const cwd = process.cwd();
const migrationsDir = path.join(cwd, "migrations");

const MIGRATION_RE = /^\d{8}_\d{6}_[a-z0-9_]+\.js$/;

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.log("✅ migrations directory not found; nothing to check");
  process.exit(0);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter(name => name.endsWith(".js") && !name.startsWith("_"))
  .sort();

for (const file of files) {
  if (!MIGRATION_RE.test(file)) {
    fail(`Invalid migration filename format: ${file}`);
  }
}

for (let i = 1; i < files.length; i += 1) {
  if (files[i - 1] >= files[i]) {
    fail(`Migrations are not strictly sorted: ${files[i - 1]} then ${files[i]}`);
  }
}

const seenVersions = new Set();
for (const file of files) {
  const version = file.slice(0, "YYYYMMDD_HHMMSS".length);
  if (seenVersions.has(version)) {
    fail(`Duplicate migration version prefix: ${version}`);
  }
  seenVersions.add(version);
}

for (const file of files) {
  const full = path.join(migrationsDir, file);
  const mod = await import(pathToFileURL(full).href);
  const migration = mod.default;
  if (!migration || typeof migration !== "object") {
    fail(`Migration missing default export object: ${file}`);
  }
  if (typeof migration.description !== "string" || !migration.description.trim()) {
    fail(`Migration missing description: ${file}`);
  }
  if (typeof migration.up !== "function") {
    fail(`Migration missing up(client) function: ${file}`);
  }
}

console.log(`✅ Migration checks passed (${files.length} file(s))`);

