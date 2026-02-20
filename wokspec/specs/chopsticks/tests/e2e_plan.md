# Phase 8 — Integration Testing & Canary Deploy Plan

> **Document type:** Planning / Specification  
> **Status:** Draft  
> **Last updated:** 2025  
> **Dependency:** `wokspec/specs/chopsticks/recon/missing_inputs.json` — `sandbox_server_id` must be filled before executing sandbox setup steps.

---

## 1. Test Categories

### 1.1 Smoke Tests
Quick go/no-go checks run on every deploy before further testing proceeds.

| Test | Pass Condition |
|---|---|
| Bot process is running | `GET /health` returns `200 OK` within 2 s |
| Discord gateway connected | Health payload includes `"gateway": "connected"` |
| Database reachable | Health payload includes `"db": "ok"` |
| Redis reachable | Health payload includes `"redis": "ok"` |
| Lavalink reachable | Health payload includes `"lavalink": "ok"` |
| Prometheus metrics exposed | `GET /metrics` returns `200` and `# HELP` content |

### 1.2 Command Invocation Tests
Full-stack command tests that fire a real (or mocked) Discord interaction and assert outcomes.

| Test Scope | Coverage |
|---|---|
| Permission guard tests | All 30 new commands return `MISSING_PERMISSIONS` when invoked without required permission |
| Rate-limit bucket tests | Each rate category (`user`, `mod`, `admin`, `ai`, `economy`, `music`) enforces its limit |
| Happy-path invocations | Each of the 30 new commands executes successfully with valid inputs |
| Validation error tests | Invalid arguments return structured error embeds (not unhandled exceptions) |
| Subcommand routing tests | Subcommands (`/ai summarize`, `/music playlist load`, etc.) route to correct handler |

### 1.3 Rate Limit Tests
Focused burst tests that verify the rate-limit middleware behaves correctly under load.

| Scenario | Expected Result |
|---|---|
| 11 `mod` commands in 10 s from same user | 11th request rejected with `429` and `Retry-After` header |
| 21 `user` commands in 60 s | 21st request rejected |
| 6 `admin` commands in 60 s | 6th request rejected |
| 6 `ai` commands in 60 s | 6th request rejected |
| Separate users share no rate-limit state | User A's bucket does not affect User B |
| Rate-limit counter resets after window | Requests succeed again after window expires |

### 1.4 Voice Stack Tests
Tests that exercise the Lavalink integration end-to-end.

| Test | Pass Condition |
|---|---|
| Join voice channel | Bot joins channel and Lavalink node reports active player |
| Play track | Track begins playing, `nowPlaying` state set |
| Queue management | Tracks enqueued, skipped, and removed correctly |
| `/music shuffle` | Queue order changes, index-0 track unchanged |
| `/music eq` preset | Lavalink filter payload matches expected band gains |
| Lavalink disconnect recovery | Bot reconnects within 30 s; queue resumes |

### 1.5 AI Provider Tests
Tests for the AI integration layer (uses mock provider in CI; real provider in staging).

| Test | Pass Condition |
|---|---|
| `/ai translate` with mock | Returns mocked translation in expected embed format |
| `/ai summarize` prompt shape | AI provider receives correct system prompt and user content |
| Persona injection | Custom guild persona is prepended to system prompt |
| Timeout handling | AI calls that exceed 10 s return graceful error embed |
| Token logging | Each AI call writes a row to `ai_usage_log` |

### 1.6 Moderation Action Tests
Tests that verify moderation commands produce the correct Discord API side effects.

| Test | Pass Condition |
|---|---|
| `/massban` bans each ID | `guild.bans.create` called once per valid ID |
| `/lockdown` modifies overwrites | `channel.permissionOverwrites.edit` called for all text channels in category |
| `/note` stores record | `mod_notes` row created with correct fields |
| `/history` returns sorted entries | Entries are in reverse-chronological order |
| Audit log entries | Each mod action creates a Discord audit log entry with correct reason |

---

## 2. Sandbox Setup

### 2.1 Prerequisites

1. Read `wokspec/specs/chopsticks/recon/missing_inputs.json` and ensure `sandbox_server_id` is populated with a dedicated test Discord server ID.
2. Create a test bot application in the Discord Developer Portal (separate from the production bot).
3. Store the test bot token as `DISCORD_TEST_TOKEN` in `.env.test`.
4. Invite the test bot to the sandbox server with **all permissions** (integer `8` / Administrator) for ease of testing.

### 2.2 Sandbox Server Configuration

```
Sandbox server name:  chopsticks-e2e-sandbox
Required channels:
  - #bot-test-general     (text, for general command tests)
  - #mod-log              (text, configured as mod log channel)
  - #suggestions          (text, configured as suggestions channel)
  - #announcements        (text, for scheduled message tests)
  - #auction              (text, configured as auction channel)
  - Test Voice Channel    (voice, for music stack tests)

Required roles:
  - TestAdmin     (all permissions)
  - TestMod       (ModerateMembers, ManageMessages, ManageChannels)
  - TestUser      (no special permissions)

Guild settings (set via /setup or direct DB seed):
  - mod_log_channel:    #mod-log
  - suggestion_channel: #suggestions
  - auction_channel:    #auction
  - prefix:             !
```

### 2.3 Environment Variables for E2E

```dotenv
# .env.test
DISCORD_TEST_TOKEN=<sandbox bot token>
DISCORD_TEST_GUILD_ID=<sandbox_server_id from missing_inputs.json>
DISCORD_TEST_CHANNEL_ID=<#bot-test-general channel ID>
DISCORD_TEST_VOICE_CHANNEL_ID=<Test Voice Channel ID>
DISCORD_TEST_ADMIN_ROLE_ID=<TestAdmin role ID>
DISCORD_TEST_MOD_ROLE_ID=<TestMod role ID>
DISCORD_TEST_USER_ID=<a real Discord user ID to use as test target>
AI_PROVIDER=mock          # Use mock provider in CI
EXCHANGE_API_KEY=<test key or leave blank for cached-only>
```

---

## 3. Synthetic Test Scripts

### 3.1 Health Check

```bash
#!/usr/bin/env bash
# smoke-health.sh — assert all health sub-checks pass
BASE_URL="http://localhost:3000"

response=$(curl -sf "$BASE_URL/health")
if [ $? -ne 0 ]; then
  echo "FAIL: /health endpoint unreachable"; exit 1
fi

for key in gateway db redis lavalink; do
  value=$(echo "$response" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));process.stdout.write(d['$key']||'missing')")
  if [ "$value" != "ok" ] && [ "$value" != "connected" ]; then
    echo "FAIL: health.$key = $value"; exit 1
  fi
done

echo "PASS: all health checks ok"
```

### 3.2 Metrics Endpoint

```bash
#!/usr/bin/env bash
# smoke-metrics.sh — assert Prometheus metrics are exposed
response=$(curl -sf "http://localhost:3000/metrics")
if [ $? -ne 0 ]; then
  echo "FAIL: /metrics endpoint unreachable"; exit 1
fi

if ! echo "$response" | grep -q "# HELP"; then
  echo "FAIL: /metrics response does not contain Prometheus text format"; exit 1
fi

echo "PASS: Prometheus metrics endpoint ok"
```

### 3.3 Database Connection Check

```bash
#!/usr/bin/env bash
# smoke-db.sh — assert database responds to a simple query via admin API
response=$(curl -sf "http://localhost:3000/admin/db-ping" \
  -H "Authorization: Bearer $ADMIN_API_SECRET")
if [ $? -ne 0 ]; then
  echo "FAIL: /admin/db-ping returned non-200"; exit 1
fi
echo "PASS: database ping ok"
```

### 3.4 Redis Ping via Node

```js
// smoke-redis.mjs — assert Redis connection is live
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
const pong = await client.ping();
if (pong !== 'PONG') {
  console.error('FAIL: Redis ping returned', pong);
  process.exit(1);
}
await client.disconnect();
console.log('PASS: Redis ping ok');
```

### 3.5 Rate-Limit Burst Assertion

```js
// smoke-rate-limit.mjs — fire 11 requests to a mod endpoint and assert 429 on 11th
import fetch from 'node-fetch';

const endpoint = 'http://localhost:3000/interactions'; // internal test shim
const payload = { type: 2, data: { name: 'note' }, guild_id: process.env.DISCORD_TEST_GUILD_ID };

let rejected = false;
for (let i = 1; i <= 11; i++) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Test-Auth': process.env.E2E_TEST_SECRET },
    body: JSON.stringify(payload),
  });
  if (i === 11 && res.status === 429) {
    rejected = true;
    console.log('PASS: 11th request correctly rejected with 429');
  } else if (i < 11 && res.status === 429) {
    console.error(`FAIL: request ${i} rejected prematurely`);
    process.exit(1);
  }
}

if (!rejected) {
  console.error('FAIL: 11th request was not rate-limited');
  process.exit(1);
}
```

---

## 4. Bot Interaction Sequences (Pseudocode)

> These sequences use a discord.js test-client shim or the mock interaction runner available at `test/helpers/interaction-runner.js`.

### Sequence 1: `/massban` happy path
```
GIVEN  caller has BanMembers permission
WHEN   invoke /massban users:"111 222 333" reason:"test raid"
THEN   guild.bans.create called 3 times (once per ID)
AND    ephemeral embed contains "Banned 3 users"
AND    audit log entries created for each ban
```

### Sequence 2: `/massban` permission denied
```
GIVEN  caller lacks BanMembers permission
WHEN   invoke /massban users:"111"
THEN   response is ephemeral error embed "Missing Permissions: BanMembers"
AND    guild.bans.create NOT called
```

### Sequence 3: `/lockdown` with timed unlock
```
GIVEN  caller has ManageChannels permission
AND    category "Support" has 3 text channels
WHEN   invoke /lockdown category:Support duration:30m
THEN   channel.permissionOverwrites.edit called 3 times with SendMessages=false
AND    scheduled unlock job created for T+30min
AND    after mocked 30min, permissionOverwrites restored to snapshots
```

### Sequence 4: `/ai summarize` with mock provider
```
GIVEN  AI_PROVIDER=mock returns "Summary: test messages"
AND    caller has ManageMessages permission
WHEN   invoke /ai summarize count:10
THEN   Discord API fetchMessages called with limit:10
AND    mock AI provider called with correct system prompt
AND    ephemeral embed contains "Summary: test messages"
```

### Sequence 5: `/music shuffle` undo
```
GIVEN  bot in voice channel with queue [A, B, C, D, E]
AND    track A is now-playing
WHEN   invoke /music shuffle
THEN   queue order changes, A remains at index 0
WHEN   invoke /music shuffle undo:true
THEN   queue restores to [A, B, C, D, E]
```

### Sequence 6: `/trade` accept flow
```
GIVEN  User1 has 500 coins, User2 has 300 coins
WHEN   User1 invokes /trade user:User2 offer:200coins request:100coins
THEN   DM sent to User2 with Accept/Decline buttons
WHEN   User2 clicks Accept
THEN   User1 balance becomes 400, User2 balance becomes 200
AND    Trade record marked completed
```

### Sequence 7: `/trade` timeout
```
GIVEN  User1 invokes /trade targeting User2
WHEN   5 minutes elapse without User2 response
THEN   Trade record marked expired
AND    Trade embed updated to "Trade expired"
AND    No balance changes
```

### Sequence 8: `/suggest` channel not configured
```
GIVEN  guild has no suggestions channel configured
WHEN   any user invokes /suggest text:"Add trivia"
THEN   ephemeral embed returned: "Suggestions channel not set up. Ask an admin to run /setup."
AND    no message posted to any channel
```

### Sequence 9: `/convert` currency API fallback
```
GIVEN  currency exchange API is unavailable (timeout simulated)
WHEN   user invokes /convert value:100 from:USD to:EUR
THEN   response uses cached rate
AND    embed footer reads "Using cached rates (last updated: <timestamp>)"
```

### Sequence 10: `/history` pagination
```
GIVEN  user has 25 moderation records (mocked DB)
WHEN   mod invokes /history user:@Target
THEN   page 1 shows records 1-10 in reverse-chronological order
AND    navigation buttons rendered
WHEN   mod clicks "Next"
THEN   page 2 shows records 11-20
AND    page counter reads "Page 2 / 3"
```

---

## 5. Canary Deploy Checklist

### Step 1 — Pre-deploy
- [ ] All unit tests pass in CI (`npm test`)
- [ ] Docker images built and tagged with the release SHA
- [ ] `CHANGELOG.md` updated for the release
- [ ] New slash commands registered via `npm run deploy-commands -- --env staging`
- [ ] `missing_inputs.json` reviewed; no unresolved blockers

### Step 2 — Deploy to Staging
```bash
# Pull new images on staging host
docker compose -f docker-compose.stack.yml pull

# Bring up new bot container with zero-downtime replace
docker compose -f docker-compose.stack.yml up -d --no-deps bot

# Wait for health
sleep 10
curl -sf http://localhost:3000/health | jq .
```

### Step 3 — Run Smoke Tests on Staging
```bash
cd scripts/e2e
bash smoke-health.sh
bash smoke-metrics.sh
bash smoke-db.sh
node smoke-redis.mjs
node smoke-rate-limit.mjs
```
All five scripts must exit `0` before proceeding.

### Step 4 — Run Full E2E Suite on Staging
```bash
DISCORD_TEST_GUILD_ID=$STAGING_GUILD_ID npm run test:e2e
```
Expected: all 10 interaction sequences pass.

### Step 5 — Monitor Staging for 30 Minutes
- Open Grafana dashboard: **Chopsticks — Command Overview**
- Verify:
  - Error rate < 1 %
  - P99 command latency < 2 s
  - No alert rules firing

### Step 6 — Promote to Production
```bash
# Tag staging image as production
docker tag chopsticks-bot:$SHA chopsticks-bot:production

# Deploy to production host
ssh prod-host "
  docker compose -f docker-compose.production.yml pull &&
  docker compose -f docker-compose.production.yml up -d --no-deps bot
"
```

### Step 7 — Post-deploy Verification
```bash
# Run smoke tests against production
BASE_URL=https://bot.internal curl -sf $BASE_URL/health | jq .
```

### Step 8 — Observe for 30 Minutes
- Monitor error rate, latency, and rate-limit hit metrics in Grafana.
- Confirm all new commands appear in `/help` on the production server.

---

## 6. Rollback Plan

### 6.1 Trigger Conditions
Roll back immediately if **any** of the following occur within 30 minutes of a production deploy:

| Condition | Threshold |
|---|---|
| Command error rate | > 5 % of invocations over 5-min window |
| P99 command latency | > 5 s sustained for > 2 min |
| Bot offline / gateway disconnect | > 2 minutes |
| Database error rate | > 1 % of queries over 5-min window |
| Any P1 alert firing | Immediately |

### 6.2 Rollback Commands

```bash
# Step 1 — Identify the previous stable image tag
docker images chopsticks-bot | head -5

# Step 2 — Re-tag the previous stable image as production
docker tag chopsticks-bot:$PREVIOUS_SHA chopsticks-bot:production

# Step 3 — Restart the bot container on the production host
ssh prod-host "
  docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot
"

# Step 4 — Verify rollback health
sleep 15
curl -sf https://bot.internal/health | jq .

# Step 5 — If slash commands changed, re-register previous command manifest
npm run deploy-commands -- --env production --manifest releases/$PREVIOUS_SHA/commands.json
```

### 6.3 Post-Rollback Steps
1. File an incident report in `#incidents` Slack channel.
2. Open a GitHub issue tagged `regression` with error rate screenshots attached.
3. Assign to the implementing engineer for root-cause analysis.
4. Do not re-attempt the deploy until the root cause is resolved and a fix is merged.
