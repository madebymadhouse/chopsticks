# User Onboarding Guide — Chopsticks Discord Bot

> **Document type:** Runbook / User Guide  
> **Audience:** Regular server members using Chopsticks for the first time  
> **Last updated:** 2025

---

## 1. Discovering Commands

### Using `/help`

The fastest way to see everything Chopsticks can do:

```
/help
```

This shows a categorized list of all available commands. You can drill into a category:

```
/help category:music
/help category:economy
/help category:ai
```

Or look up a specific command:

```
/help command:streak
/help command:trade
```

### Using `/tutorials`

For step-by-step walkthroughs of multi-command workflows:

```
/tutorials
```

Available tutorials include:
- **Getting Started with Economy** — earn your first coins and start playing
- **Music Player Guide** — join voice and play music
- **AI Features** — use translation, summarization, and more
- **Moderation Overview** (mod-only) — notes, history, and lockdown

### Slash Command Autocomplete

In any text channel, type `/` to see a list of available slash commands with descriptions. Use the arrow keys or continue typing to filter by name.

### Prefix Commands

If your server has a legacy prefix configured (default `!`), you can also run commands as:
```
!help
!streak
!slots bet:100
```
The server admin can tell you the configured prefix, or try `/config view` to see it.

---

## 2. Economy — Getting Started in 3 Commands

### Command 1 — Claim your daily reward

```
/daily
```
Collect your daily coin bonus. Come back every day to build a streak and earn bigger bonuses.

### Command 2 — Check your balance and streak

```
/balance
/streak
```
`/balance` shows your current coins. `/streak` shows your login streak and the bonus multiplier you have earned (e.g., a 7-day streak gives a 1.5× daily bonus).

### Command 3 — Play your first game

```
/casino slots bet:50
```
Place a bet to try the slot machine. If you match symbols, you win coins. Start with a small bet to get a feel for it.

**Other economy commands to explore:**
- `/trade user:@Friend offer:100coins request:50coins` — swap coins or items with a friend
- `/heist join` — join a group heist for a bigger payout
- `/leaderboard` — see who has the most coins on the server

---

## 3. Music — Getting Started

### Step 1 — Join a voice channel

Join any voice channel in the server. The bot will follow you into the channel when you play music.

### Step 2 — Play your first track

```
/music play query:never gonna give you up
```

You can use a search query, a YouTube URL, a Spotify URL, or a SoundCloud URL:
```
/music play query:https://www.youtube.com/watch?v=dQw4w9WgXcQ
/music play query:https://open.spotify.com/track/...
```

### Step 3 — Manage the queue

```
/music queue          — see all tracks in the queue
/music skip           — skip the current track
/music shuffle        — shuffle the queue
/music pause          — pause playback
/music resume         — resume playback
/music stop           — stop playback and clear the queue
```

### Saving a Playlist

After building a queue you love:
```
/music save name:"My Favorites"
```
Load it next time:
```
/music playlist load name:"My Favorites"
```

### Equalizer Presets

```
/music eq preset:bass-boost
/music eq preset:pop
/music eq preset:flat       ← resets to default
```

---

## 4. AI Features — Getting Started

### Using AI Translation (Free, No Key Required)

Translate any text into any language:
```
/ai translate text:"Hello, how are you?" target_language:French
```

### Using AI Summarization (Requires mod/admin)

If you are a moderator, you can summarize recent channel messages:
```
/ai summarize count:50
```

### Linking Your Own API Key (If Supported by Your Server)

Some servers allow users to provide their own AI API key for enhanced features. Ask your admin if this is enabled:
```
/ai key set key:sk-...
```
When your own key is linked, AI features use your quota rather than the shared guild quota.

### Using the Free Model

If no personal key is configured, Chopsticks uses the server's shared AI model. Free-model usage is rate-limited per user (see `/help category:ai` for current limits).

---

## 5. FAQ

**Q: Why does the bot say "Missing Permissions" when I run a command?**  
A: Some commands require Discord permissions (e.g., BanMembers, ManageMessages) or specific server roles (e.g., @Moderator). If you believe you should have access, ask a server admin to check your role assignments.

**Q: I ran `/daily` but it says "already claimed." When can I claim again?**  
A: The daily reward resets every 24 hours from the time of your last claim, not at midnight. Wait the full 24 hours and try again.

**Q: The bot left the voice channel while I was still listening. Why?**  
A: Chopsticks automatically leaves voice channels after a configurable inactivity period (default: 5 minutes of silence). To keep it in the channel, keep the queue active or ask an admin to extend the inactivity timeout.

**Q: My `/trade` request expired before my friend could accept. What happened to my items?**  
A: Trade proposals expire after 5 minutes of no response. Your items were never deducted — the trade simply timed out. Re-send the trade and ask your friend to accept quickly.

**Q: How do I remove my birthday from the server?**  
A: Run `/birthday set` again and leave the fields blank, or ask a moderator to use the admin birthday-management command. If your server has enabled privacy settings, run `/privacy delete` to remove all your stored data.
