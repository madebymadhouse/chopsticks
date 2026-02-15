import { REST, Routes } from "discord.js";

const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || "").trim();
const CLIENT_ID = String(process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || "").trim();
const GUILD_ID = String(process.env.STAGING_GUILD_ID || process.env.DEV_GUILD_ID || process.env.GUILD_ID || "").trim();

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!DISCORD_TOKEN) fail("DISCORD_TOKEN missing");
if (!CLIENT_ID) fail("CLIENT_ID (or DISCORD_CLIENT_ID) missing");
if (!GUILD_ID) fail("STAGING_GUILD_ID (or DEV_GUILD_ID/GUILD_ID) missing");

const requiredCommands = ["help", "agents", "music", "voice", "scripts", "pools"];
const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

async function main() {
  // Auth sanity
  const me = await rest.get(Routes.user("@me"));
  if (!me?.id) fail("Unable to authenticate Discord token.");

  // Bot presence in staging guild
  await rest.get(Routes.guildMember(GUILD_ID, me.id));

  // Fetch guild commands and validate expected core surface
  const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
  if (!Array.isArray(guildCommands) || guildCommands.length === 0) {
    fail("No guild commands found; deploy commands before smoke test.");
  }

  const names = new Set(guildCommands.map(c => c.name));
  for (const name of requiredCommands) {
    if (!names.has(name)) {
      fail(`Missing required command in guild scope: /${name}`);
    }
  }

  const scripts = guildCommands.find(c => c.name === "scripts");
  if (!scripts || !Array.isArray(scripts.options)) {
    fail("/scripts command schema missing options.");
  }
  const subcommands = new Set(scripts.options.map(o => o.name));
  for (const sub of ["create", "list", "test", "run"]) {
    if (!subcommands.has(sub)) fail(`/scripts missing subcommand: ${sub}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        botUserId: me.id,
        guildId: GUILD_ID,
        commandCount: guildCommands.length,
        requiredCommands
      },
      null,
      2
    )
  );
}

main().catch(err => {
  fail(err?.message || String(err));
});

