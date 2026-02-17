# Music Command Fixes - Day 7 Post-Week 1

## Issues Identified:

1. **Songs queue but don't play** - Agent joins but playback doesn't start
2. **Resume resets song** - Resume button restarts from beginning instead of resuming
3. **Buttons are spammable** - No debouncing/idempotency checks
4. **No rate limiting** - Music commands can be spammed

## Root Causes:

### Issue 1: Play command not starting playback
- After search selection (line 1099-1110), sends "play" command
- Command likely succeeds at queueing but doesn't trigger playback
- Need to check agent's play handler response

### Issue 2: Resume behavior
- Need to verify if resume is calling player.pause(false) or player.play()
- Check if it's seeking to position 0

### Issue 3: Button spam
- No interaction acknowledgment tracking
- Multiple users can spam same buttons
- No cooldown between button presses

## Fixes Needed:

1. Add interaction debouncing (Map of interactionId → processing)
2. Add per-button cooldowns (Map of userId:buttonId → lastPressed)
3. Add resume/pause state tracking
4. Ensure play command triggers playback after queueing
5. Add rate limiting to music commands
