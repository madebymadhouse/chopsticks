# Testing Guide - Hardening Improvements

## What Was Changed

### 1. Pool List Improvements (`/pools list`)
**What to look for:**
- 🌐 icon for public pools, 🔒 for private
- Agent counts with health indicators:
  - ✅ for active agents
  - ⚠️ for inactive agents
- Format: "**10 agents** (✅ 8 active, ⚠️ 2 inactive)"
- "goot27 (Official)" for bot owner

### 2. Music Error Messages
**Scenarios to test:**

#### Test 1: No Agents Deployed
1. Make sure no agents are deployed: `/agents status`
2. Try to play music: `/music play test`
3. Expected output:
   ```
   ❌ No agents deployed in this guild.
   💡 Fix: Use `/agents deploy 10` to deploy agents for music playback.
   ```

#### Test 2: All Agents Busy
1. Deploy 1 agent: `/agents deploy 1`
2. Start music in one voice channel
3. Join different voice channel
4. Try to play music: `/music play test`
5. Expected output:
   ```
   ⏳ All agents are currently busy.
   💡 Try again in a few seconds or deploy more agents with `/agents deploy <count>`.
   ```

#### Test 3: No Active Session
1. Run queue command without music playing: `/music queue`
2. Expected output:
   ```
   ❌ No active music session in this voice channel.
   💡 Use `/music play <song>` to start playing music.
   ```

### 3. Agent Status Display (`/agents status`)
**What to look for:**
- 🤖 icon in title
- Overview section with:
  - Registered count
  - Connected count
  - Available count
- Guild section with:
  - ✅ Idle count
  - ⏳ Busy count
  - 🔴 Offline count
- Connected Agents section with status icons per agent

### 4. Agent Disconnect Notifications
**How to test:**
1. Deploy an agent and start music
2. Simulate disconnect by restarting agents container:
   ```bash
   docker compose -f docker-compose.production.yml restart agents
   ```
3. Expected behavior:
   - Music stops
   - Message appears in text channel:
     ```
     ⚠️ Music agent disconnected from [Voice Channel Name]
     💡 Music playback has stopped. Use `/music play` to resume.
     ```

## Quick Test Commands

```bash
# Check pool status
/pools list

# Check agent status
/agents status

# Test music with no agents
/music play never gonna give you up

# Deploy agents
/agents deploy 10

# Test music with agents
/music play never gonna give you up

# View music queue
/music queue

# Test pool public list
/pools public
```

## Expected Improvements

**Before vs After:**

| Aspect | Before | After |
|--------|--------|-------|
| Pool list | Plain text, no icons | Emojis, health indicators |
| Error messages | Generic, unhelpful | Specific, actionable |
| Agent status | Cluttered with timestamps | Clean, emoji indicators |
| Disconnect handling | Silent failure | User notification |

## Known Good State

After deployment:
- ✅ Bot online: Chopsticks#9414
- ✅ Agent connected: agent1468195142467981395
- ✅ Health endpoint: http://localhost:8080/healthz
- ✅ Dashboard: http://localhost:3003
- ✅ Database: chopsticks_db (postgres)

## Troubleshooting

### If pool list doesn't show improvements:
- Clear Discord cache (Ctrl+R to reload)
- Wait 5 seconds for command sync

### If error messages look the same:
- Verify bot container was rebuilt
- Check logs: `docker compose -f docker-compose.production.yml logs bot --tail=50`

### If agent disconnect notifications don't appear:
- Ensure bot has permission to send messages in text channels
- Check logs for "Failed to notify channel" warnings
- Verify text channel exists in same category as voice channel

## Success Criteria

✅ Pool list shows emojis and health indicators
✅ Music errors include actionable guidance with 💡
✅ Agent status shows clear ✅⏳🔴 indicators
✅ Disconnect notification appears when agent drops
✅ All functionality works as before (no regressions)
