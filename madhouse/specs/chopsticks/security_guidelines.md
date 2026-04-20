# Chopsticks Security Guidelines

This document is the authoritative security reference for all Chopsticks features.
Every new feature must be reviewed against these guardrails before merge.

---

## 1. Discord Intents Required

| Intent | Reason | Risks if missing |
|--------|--------|-----------------|
| `Guilds` | Guild/channel resolution | All commands fail |
| `GuildMembers` | Moderation target lookups | Kick/ban targeting fails |
| `GuildVoiceStates` | Voice channel management | Voice features fail |
| `GuildMessages` (privileged) | Prefix command support | Prefix commands silently fail |
| `MessageContent` (privileged) | Prefix command parsing | Prefix commands silently fail |
| `GuildModeration` | Audit log integration | Mod log events missing |

**Rule**: Never enable `GuildPresences` or `GuildMessageTyping` — high message volume, no current use.

---

## 2. Bot Permission Model

### Minimum required permissions (invite scope)
```
BanMembers, KickMembers, ModerateMembers, ManageMessages,
ManageRoles (below bot role), Connect, Speak, MuteMembers, DeafenMembers,
MoveMembers, SendMessages, EmbedLinks, AttachFiles,
ReadMessageHistory, AddReactions, UseExternalEmojis,
UseApplicationCommands, ViewAuditLog
```

### Do NOT grant
- `Administrator` — never needed, grants full server control
- `ManageServer` — not needed; use per-feature user permission gates
- `ManageWebhooks` — not needed currently

---

## 3. User Permission Gates per Command Category

| Category | Minimum User Permission | Notes |
|----------|------------------------|-------|
| `mod`    | `ModerateMembers` or `BanMembers` | Enforced in command `meta.userPerms` |
| `admin`  | `ManageGuild` | Bot config, voice model, server settings |
| `music`  | None (default) | Can be restricted per-guild |
| `voice`  | None or `ManageChannels` for admin sub-commands | |
| `fun`, `core`, `economy` | None | Accessible to all members |
| `assistant` | None (default); can be locked per-guild | |

**Rule**: All `mod` and `admin` commands must set `setDefaultMemberPermissions()` in SlashCommandBuilder AND check `userPerms` in `meta`.

---

## 4. Secrets Policy

### Required secrets (all must be present at startup)
| Variable | Format | Minimum strength | Rotation frequency |
|----------|--------|------------------|--------------------|
| `DISCORD_TOKEN` | Discord bot token | N/A | On compromise |
| `POSTGRES_URL` | Connection string | — | Every 90 days |
| `AGENT_TOKEN_KEY` | 64 hex chars (32 bytes) | — | Every 90 days |
| `DASHBOARD_SESSION_SECRET` | Random string | 32+ chars | Every 90 days |
| `DASHBOARD_ADMIN_TOKEN` | Random string | 32+ chars | Every 90 days |
| `REDIS_PASSWORD` | Random string | 16+ chars | Every 90 days |
| `LAVALINK_PASSWORD` | Random string | 16+ chars | On deploy |

### Rotation procedure
1. Generate new value: `openssl rand -hex 32`
2. Update `.env.comprehensive` (gitignored)
3. For `AGENT_TOKEN_KEY`: existing encrypted API keys become unreadable — guilds must re-link
4. For `POSTGRES_URL`: run `ALTER USER ... PASSWORD '...'` inside container
5. Restart bot + dashboard containers
6. Run `node scripts/check-env.js` to verify

### Storage rules
- Secrets never in source code, even in comments
- `.env.comprehensive` and `.env.*` (except `.env.example`) are gitignored
- Use Docker secrets or a vault for production multi-node deployments
- `AGENT_TOKEN_KEY` encrypts all guild API tokens — treat as master key

---

## 5. Rate Limit Policy

### Default per-category limits (see `src/utils/rateLimitConfig.js`)

| Category | Limit | Window | Rationale |
|----------|-------|--------|-----------|
| `mod` | 3 | 30s | Prevent mass-mod abuse |
| `admin` | 5 | 60s | Config changes are slow/intentional |
| `music` | 10 | 15s | Frequent but bounded |
| `voice` | 5 | 30s | Moderate |
| `assistant` | 3 | 30s | LLM calls expensive |
| `fun`, `core`, `economy` | 12 | 10s | Standard interactive |
| `tools` | 8 | 15s | Utility |

### Override via env
```
RL_MOD_LIMIT=3    RL_MOD_WINDOW=30
RL_ADMIN_LIMIT=5  RL_ADMIN_WINDOW=60
...
```

### Sensitive actions (e.g., `/model link`, `/agent register`)
Must use `checkSensitiveActionLimit` from `modernRateLimiter.js` (3/5min, block 1hr).

---

## 6. Voice LLM Security

- Default provider: `none` — no LLM calls made without admin opt-in
- API keys stored encrypted (AES-256-GCM, AGENT_TOKEN_KEY)
- Keys entered via Discord ephemeral modal only — never in plain message options
- Keys validated before persisting (cheap health check)
- Mad House does NOT pay for any provider calls — all keys are admin-owned
- Voice responses are ephemeral or in a dedicated channel — not stored

---

## 7. Audit Logging

All moderation actions must dispatch to `dispatchModerationLog()`. Required fields:
`action`, `ok`, `actorId`, `actorTag`, `targetId`, `targetTag`, `reason`, `commandName`, `channelId`.

Audit logs are retained in `audit_log` table. Sensitive fields (tokens, keys) must never appear in audit log entries.

---

## 8. New Feature Checklist

Before merging any new command or service:
- [ ] `meta.userPerms` set appropriately
- [ ] `setDefaultMemberPermissions()` set if admin/mod
- [ ] Rate limit category set in `meta.category`
- [ ] No secrets in source code (run `node scripts/check-env.js`)
- [ ] Audit log dispatch for destructive/moderation actions
- [ ] Ephemeral replies for sensitive data (tokens, keys, personal info)
- [ ] Error messages don't leak internal state (stack traces, DB errors)
- [ ] Unit tests for happy path + edge case inputs

---

## 9. Dependency Security

- Run `npm audit` before every release
- Pin major versions in `package.json`
- Review `package-lock.json` changes in PRs
- Add `npm audit --audit-level=high` to CI pipeline

---

*Last updated: auto-generated by Plan Agent. Review and update on each major feature release.*
