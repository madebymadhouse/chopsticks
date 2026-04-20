# Command Registry — Chopsticks Discord Bot

> Generated: 2026-02-20T22:13:44.910Z  |  Total: **75** commands

## Summary

| Metric | Count |
|--------|-------|
| with slash name | 74 |
| without slash name | 1 |
| with tests | 20 |
| without tests | 55 |
| missing discord perm gate | 31 |
| missing category | 40 |
| uses voice | 0 |
| requires api key | 0 |

## 🔴 Blocking Issues (must fix before next deploy)

| Command | Issue Code | Detail |
|---------|-----------|--------|
| `agents` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `alias` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `automations` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `autorole` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `ban` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `clearwarns` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `config` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `custom` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `giveaway` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `kick` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `levels` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `lock` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `logs` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `macro` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `modlogs` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `nick` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `prefix` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `purge` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `reactionroles` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `role` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `scripts` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `setup` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `slowmode` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `softban` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `starboard` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `timeout` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `unban` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `unlock` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `voice` | `NO_SLASH_NAME` | No .setName() call found; slash command may not deploy correctly. |
| `warn` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `warnings` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |
| `welcome` | `MISSING_DISCORD_PERM_GATE` | Has userPerms but no setDefaultMemberPermissions — Discord-side permission gate absent. |

## 🟡 Warnings

| Command | Issue Code | Detail |
|---------|-----------|--------|
| `8ball` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `agent` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `autorole` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `avatar` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `balance` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `bank` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `botinfo` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `choose` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `coinflip` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `collection` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `commands` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `craft` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `daily` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `echo` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `fight` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `gather` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `giveaway` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `help` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `inventory` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `invite` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `leaderboard` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `pay` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `ping` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `poll` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `prefix` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `profile` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `quests` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `remind` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `roleinfo` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `roll` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `serverinfo` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `shop` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `trivia` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `uptime` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `use` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `userinfo` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `vault` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `voice` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `welcome` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |
| `work` | `MISSING_CATEGORY` | No explicit category in meta; rate limit inferred or falls back to default (12/10s). |

## Command Table

| Command | Category | Guild Only | UserPerms | Has Gate | Has Tests | Voice | API Key | RL limit/window |
|---------|----------|-----------|-----------|----------|-----------|-------|---------|-----------------|
| `/8ball` | fun | — | — | — | ❌ | — | — | 12/10s |
| `/agent` | social | — | — | — | ✅ | — | — | 5/60s |
| `/agents` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/alias` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/assistant` | assistant | ✅ | — | — | ❌ | — | — | 3/30s |
| `/automations` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/autorole` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/avatar` | util | — | — | — | ❌ | — | — | 12/10s |
| `/balance` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/ban` | mod | ✅ | BanMembers | ❌ | ❌ | — | — | 2/30s |
| `/bank` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/botinfo` | util | — | — | — | ❌ | — | — | 12/10s |
| `/choose` | fun | — | — | — | ❌ | — | — | 12/10s |
| `/clearwarns` | mod | ✅ | ModerateMembers | ❌ | ❌ | — | — | 3/30s |
| `/coinflip` | fun | — | — | — | ❌ | — | — | 12/10s |
| `/collection` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/commands` | util | — | — | — | ✅ | — | — | 12/10s |
| `/config` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/craft` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/custom` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/daily` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/echo` | util | — | — | — | ❌ | — | — | 12/10s |
| `/fight` | fun | — | — | — | ❌ | — | — | 12/10s |
| `/fun` | fun | — | — | — | ✅ | — | — | 12/10s |
| `/game` | tools | — | — | — | ✅ | — | — | 8/15s |
| `/gather` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/giveaway` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/help` | util | — | — | — | ✅ | — | — | 12/10s |
| `/inventory` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/invite` | util | — | — | — | ❌ | — | — | 12/10s |
| `/kick` | mod | ✅ | KickMembers | ❌ | ❌ | — | — | 2/30s |
| `/leaderboard` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/levels` | admin | ✅ | ManageRoles | ❌ | ✅ | — | — | 5/60s |
| `/lock` | mod | ✅ | ManageChannels | ❌ | ❌ | — | — | 3/30s |
| `/logs` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/macro` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/model` | admin | ✅ | ManageGuild | ✅ | ❌ | — | — | 5/60s |
| `/modlogs` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/music` | music | ✅ | — | — | ❌ | — | — | 10/15s |
| `/nick` | mod | ✅ | ManageNicknames | ❌ | ❌ | — | — | 3/30s |
| `/pay` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/ping` | util | — | — | — | ❌ | — | — | 12/10s |
| `/poll` | tools | — | — | — | ❌ | — | — | 8/15s |
| `/pools` | pools | — | — | — | ✅ | — | — | 8/15s |
| `/prefix` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/profile` | economy | — | — | — | ✅ | — | — | 8/15s |
| `/purge` | mod | ✅ | ManageMessages | ❌ | ❌ | — | — | 2/20s |
| `/quests` | economy | — | — | — | ✅ | — | — | 8/15s |
| `/reactionroles` | admin | ✅ | ManageRoles | ❌ | ❌ | — | — | 5/60s |
| `/remind` | tools | — | — | — | ❌ | — | — | 8/15s |
| `/role` | mod | ✅ | ManageRoles | ❌ | ❌ | — | — | 3/30s |
| `/roleinfo` | util | — | — | — | ❌ | — | — | 12/10s |
| `/roll` | fun | — | — | — | ❌ | — | — | 12/10s |
| `/scripts` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/serverinfo` | util | — | — | — | ❌ | — | — | 12/10s |
| `/setup` | admin | ✅ | ManageGuild | ❌ | ✅ | — | — | 5/60s |
| `/shop` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/slowmode` | mod | ✅ | ManageChannels | ❌ | ❌ | — | — | 3/30s |
| `/softban` | mod | ✅ | BanMembers | ❌ | ❌ | — | — | 3/30s |
| `/starboard` | tools | ✅ | ManageGuild | ❌ | ✅ | — | — | 8/15s |
| `/tickets` | tools | ✅ | — | — | ✅ | — | — | 8/15s |
| `/timeout` | mod | ✅ | ModerateMembers | ❌ | ❌ | — | — | 3/30s |
| `/trivia` | fun | — | — | — | ✅ | — | — | 12/10s |
| `/tutorials` | core | — | — | — | ❌ | — | — | 12/10s |
| `/unban` | mod | ✅ | BanMembers | ❌ | ❌ | — | — | 3/30s |
| `/unlock` | mod | ✅ | ManageChannels | ❌ | ❌ | — | — | 3/30s |
| `/uptime` | util | — | — | — | ❌ | — | — | 12/10s |
| `/use` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/userinfo` | util | — | — | — | ❌ | — | — | 12/10s |
| `/vault` | economy | — | — | — | ❌ | — | — | 8/15s |
| `/voice` | voice | — | — | — | ✅ | — | — | 5/30s |
| `/warn` | mod | ✅ | ModerateMembers | ❌ | ❌ | — | — | 5/30s |
| `/warnings` | mod | ✅ | ModerateMembers | ❌ | ❌ | — | — | 3/30s |
| `/welcome` | admin | ✅ | ManageGuild | ❌ | ❌ | — | — | 5/60s |
| `/work` | economy | — | — | — | ❌ | — | — | 8/15s |

## First Atomic Implementation Prompt (Code Agent)

**PR Title:** `fix: add setDefaultMemberPermissions to all high-risk commands + explicit category metadata`

**Branch:** `feature/chopsticks/command-registry-audit`

### Preconditions
- Bot is online (Chopsticks#9414)
- `npm test` passes (218 tests green)
- `scripts/deployCommands.js` is functional

### Files to modify
```
src/commands/agents.js
src/commands/alias.js
src/commands/automations.js
src/commands/autorole.js
src/commands/ban.js
src/commands/clearwarns.js
src/commands/config.js
src/commands/custom.js
src/commands/giveaway.js
src/commands/kick.js
src/commands/levels.js
src/commands/lock.js
src/commands/logs.js
src/commands/macro.js
src/commands/modlogs.js
src/commands/nick.js
src/commands/prefix.js
src/commands/purge.js
src/commands/reactionroles.js
src/commands/role.js
src/commands/scripts.js
src/commands/setup.js
src/commands/slowmode.js
src/commands/softban.js
src/commands/starboard.js
src/commands/timeout.js
src/commands/unban.js
src/commands/unlock.js
src/commands/warn.js
src/commands/warnings.js
src/commands/welcome.js
```

### Files to create
- `test/unit/command-registry-audit.test.js` — CI gate: assert every command with userPerms has setDefaultMemberPermissions

### Acceptance Checklist
- [ ] All commands with `userPerms` have `setDefaultMemberPermissions` (automated test asserts this)
- [ ] All commands have explicit `category` in meta
- [ ] `npm test` passes (≥218 tests)
- [ ] `node scripts/deployCommands.js` succeeds with no errors
- [ ] PR contains `todos` SQL insert (see below)

### todos SQL
```sql
INSERT INTO todos (id,title,description,status)
VALUES ('command-registry-audit','Command Registry Audit','Owner: repo-maintainers; Purpose: add Discord-side permission gates and category metadata to all 75 commands','pending');
```