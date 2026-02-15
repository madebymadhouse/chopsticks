# Public Server Testing (Admin + User)

Use this to validate Chopsticks in a real public guild before broad rollout.

## 1) Preflight (required)
Run readiness check against your target public guild:

```bash
cd /home/user9007/chopsticks
PUBLIC_TEST_GUILD_ID=<your_public_guild_id> npm run smoke:public
```

Pass criteria:
- bot token is valid
- bot is present in guild
- required commands exist (guild or global)
- `/scripts` has `create/list/test/run`
- required bot permissions are present

If this fails, fix permissions first and re-run.

## 2) Slash command deploy for test guild
For immediate updates while testing:

```bash
cd /home/user9007/chopsticks
DEPLOY_MODE=guild DEPLOY_TARGET=dev DEV_GUILD_ID=<your_public_guild_id> node scripts/deployCommands.js
```

For broad rollout:

```bash
cd /home/user9007/chopsticks
DEPLOY_MODE=global node scripts/deployCommands.js
```

## 3) Admin persona test pass
Use an admin account in the target guild and execute:

1. `/help`
Expected: one embed + dropdown, no pagination spam.

2. `/agents status`
Expected: pool and live agent counts shown, actionable output.

3. `/voice setup`
Expected: VoiceMaster setup output is polished (no raw JSON).

4. `/config view`
Expected: guild config embed renders with current settings.

5. `/purge amount:5`
Expected: messages are deleted, confirmation embed is returned.

## 4) Public user persona test pass
Use a normal user account (non-admin) in same guild:

1. `/help`
Expected: readable help center and category dropdown.

2. `/ping`
Expected: latency response.

3. `/fun play`
Expected: formatted fun output.

4. `/music play query:<song>`
Expected: playback starts when an agent is available; otherwise a clear recovery message (not silent failure).

## 5) Agent/music-specific checks
- If `/music play` returns "all agents busy", run `/agents status` as admin and deploy/invite more agents.
- If agent joins and playback times out, check:
  - Lavalink health
  - agent readiness in `/agents status`
  - pool membership and active token status

## 6) Exit criteria before public announce
- readiness preflight passes
- admin pass fully green
- public user pass fully green
- no silent failures in command outputs
- monitoring shows healthy targets and no critical alerts
