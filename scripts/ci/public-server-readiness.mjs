import { REST, Routes, PermissionsBitField } from "discord.js";
import { config } from "dotenv";

config();

const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || "").trim();
const CLIENT_ID = String(process.env.CLIENT_ID || process.env.DISCORD_CLIENT_ID || "").trim();
const GUILD_ID = String(
  process.env.PUBLIC_TEST_GUILD_ID || process.env.STAGING_GUILD_ID || process.env.DEV_GUILD_ID || process.env.GUILD_ID || ""
).trim();

function fail(message, details = null) {
  console.error(`❌ ${message}`);
  if (details) {
    console.error(JSON.stringify(details, null, 2));
  }
  process.exit(1);
}

if (!DISCORD_TOKEN) fail("DISCORD_TOKEN missing");
if (!CLIENT_ID) fail("CLIENT_ID (or DISCORD_CLIENT_ID) missing");
if (!GUILD_ID) fail("PUBLIC_TEST_GUILD_ID (or STAGING_GUILD_ID/DEV_GUILD_ID/GUILD_ID) missing");

const requiredCommands = ["help", "agents", "music", "voice", "scripts", "pools", "config", "purge", "ping", "fun"];

const requiredBotPerms = [
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.ReadMessageHistory,
  PermissionsBitField.Flags.UseApplicationCommands,
  PermissionsBitField.Flags.Connect,
  PermissionsBitField.Flags.Speak,
  PermissionsBitField.Flags.ManageChannels,
  PermissionsBitField.Flags.ModerateMembers
];

const adminPersonaChecks = [
  {
    command: "/help",
    expected: "Help center embed with dropdown renders in one message."
  },
  {
    command: "/agents status",
    expected: "Shows pool + connected/ready/idle counts for this guild."
  },
  {
    command: "/voice setup",
    expected: "Voice lobby/profile setup panel renders without raw JSON."
  },
  {
    command: "/config view",
    expected: "Guild configuration summary embed returns."
  },
  {
    command: "/purge amount:5",
    expected: "Deletes messages and returns moderation embed confirmation."
  }
];

const publicPersonaChecks = [
  {
    command: "/help",
    expected: "User can open category dropdown and browse commands."
  },
  {
    command: "/ping",
    expected: "Latency embed returns quickly."
  },
  {
    command: "/fun play",
    expected: "Fun output resolves with clean formatted response."
  },
  {
    command: "/music play query:<song>",
    expected: "If agent is available, playback starts; otherwise clear actionable error."
  }
];

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

function permissionName(bit) {
  const found = Object.entries(PermissionsBitField.Flags).find(([, value]) => value === bit);
  return found ? found[0] : String(bit);
}

function toBigIntSafe(value) {
  try {
    return BigInt(value ?? 0);
  } catch {
    return 0n;
  }
}

function computeMemberPermissions(member, guildId, roles) {
  const roleMap = new Map((Array.isArray(roles) ? roles : []).map(r => [String(r.id), r]));
  const memberRoleIds = new Set((member?.roles || []).map(String));
  memberRoleIds.add(String(guildId)); // @everyone role

  let bits = 0n;
  for (const roleId of memberRoleIds) {
    const role = roleMap.get(roleId);
    if (!role?.permissions) continue;
    bits |= toBigIntSafe(role.permissions);
  }
  return new PermissionsBitField(bits);
}

async function main() {
  const me = await rest.get(Routes.user("@me"));
  if (!me?.id) fail("Unable to authenticate bot token");

  const guild = await rest.get(Routes.guild(GUILD_ID));
  const botMember = await rest.get(Routes.guildMember(GUILD_ID, me.id));
  const roles = await rest.get(Routes.guildRoles(GUILD_ID));
  const botPerms = computeMemberPermissions(botMember, GUILD_ID, roles);

  const missingPerms = requiredBotPerms.filter(bit => !botPerms.has(bit)).map(permissionName);

  const guildCommands = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
  const globalCommands = await rest.get(Routes.applicationCommands(CLIENT_ID));

  const guildNames = new Set((Array.isArray(guildCommands) ? guildCommands : []).map(c => c.name));
  const globalNames = new Set((Array.isArray(globalCommands) ? globalCommands : []).map(c => c.name));
  const effectiveNames = new Set([...globalNames, ...guildNames]);

  const missingCommands = requiredCommands.filter(name => !effectiveNames.has(name));

  const scriptsCmd = (Array.isArray(guildCommands) ? guildCommands : []).find(c => c.name === "scripts")
    || (Array.isArray(globalCommands) ? globalCommands : []).find(c => c.name === "scripts");

  let scriptsSubcommandsOk = false;
  if (scriptsCmd?.options && Array.isArray(scriptsCmd.options)) {
    const subcommands = new Set(scriptsCmd.options.map(o => o.name));
    scriptsSubcommandsOk = ["create", "list", "test", "run"].every(name => subcommands.has(name));
  }

  const report = {
    ok: missingPerms.length === 0 && missingCommands.length === 0 && scriptsSubcommandsOk,
    botUserId: me.id,
    guild: {
      id: guild.id,
      name: guild.name
    },
    commandSurface: {
      guildCommandCount: Array.isArray(guildCommands) ? guildCommands.length : 0,
      globalCommandCount: Array.isArray(globalCommands) ? globalCommands.length : 0,
      requiredCommands,
      missingCommands,
      scriptsSubcommandsOk
    },
    permissions: {
      required: requiredBotPerms.map(permissionName),
      missing: missingPerms
    },
    manualTestMatrix: {
      adminPersonaChecks,
      publicPersonaChecks
    }
  };

  if (!report.ok) {
    fail("Public server readiness check failed", report);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch(err => {
  fail(err?.message || String(err));
});
