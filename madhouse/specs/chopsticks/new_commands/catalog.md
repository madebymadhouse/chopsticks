# Phase 7 — 30 New Commands Catalog

> **Document type:** Planning / Specification  
> **Status:** Draft  
> **Last updated:** 2025  
> **Relates to:** `roadmap.json` in this directory

---

## Overview

This catalog describes 30 new slash commands for Chopsticks, organized into 6 groups of 5. Each entry provides everything an implementer needs: slash name, prefix alias, target audience, required permissions, rate-limit bucket, example invocations, test-vector summary, effort estimate, and priority score.

**Priority scale:** 1 (nice-to-have) → 5 (critical-path)  
**Effort scale:** S (< 1 day), M (1–3 days), L (3–7 days)

---

## Group 1: Moderation Enhancement

### 1. `/massban`

| Field | Value |
|---|---|
| **Slash name** | `/massban` |
| **Prefix alias** | `!massban` |
| **Description** | Ban multiple users simultaneously by providing a space- or comma-separated list of user IDs with an optional reason. |
| **Target users** | admin |
| **Permissions required** | `BanMembers` |
| **Rate category** | `mod` (10 req / 10 s) |
| **Effort** | M |
| **Priority** | 5 |

**Example invocations**
```
/massban users:123456789 987654321 reason:raid cleanup
/massban users:111,222,333 reason:coordinated spam
/massban users:444555666 dry_run:true
```

**Test vector summary**
- Assert each ID in the list receives a `guild.bans.create` call.
- Assert ephemeral success embed lists banned count and skipped IDs.
- Assert `dry_run:true` emits no bans and returns preview list.
- Assert that missing `BanMembers` permission returns a `MISSING_PERMISSIONS` error embed.
- Assert rate-limit bucket is `mod`; a 11th call within 10 s is rejected with 429.

---

### 2. `/lockdown`

| Field | Value |
|---|---|
| **Slash name** | `/lockdown` |
| **Prefix alias** | `!lockdown` |
| **Description** | Lock all text channels in a specified category, preventing `@everyone` from sending messages. |
| **Target users** | admin |
| **Permissions required** | `ManageChannels` |
| **Rate category** | `mod` |
| **Effort** | M |
| **Priority** | 5 |

**Example invocations**
```
/lockdown category:General reason:Emergency maintenance
/lockdown category:Support duration:30m
/lockdown category:General unlock:true
```

**Test vector summary**
- Assert `channel.permissionOverwrites.edit` is called for every text channel in the target category.
- Assert unlock mode restores original overwrites from stored snapshot.
- Assert timed lockdown schedules an auto-unlock job.
- Assert missing `ManageChannels` → `MISSING_PERMISSIONS` embed.
- Assert no-op when category has zero text channels.

---

### 3. `/antispam set`

| Field | Value |
|---|---|
| **Slash name** | `/antispam set` |
| **Prefix alias** | `!antispam set` |
| **Description** | Configure per-guild anti-spam thresholds (message burst limit, duplicate detection window, mention flood cap). |
| **Target users** | admin |
| **Permissions required** | `ManageGuild` |
| **Rate category** | `admin` (5 req / 60 s) |
| **Effort** | M |
| **Priority** | 4 |

**Example invocations**
```
/antispam set burst_limit:5 window_ms:3000
/antispam set mention_limit:10 action:mute
/antispam set duplicate_threshold:3 action:delete
```

**Test vector summary**
- Assert settings are persisted to `guild_settings` table with correct guild ID.
- Assert validation rejects `burst_limit` < 1 or > 100.
- Assert returned embed echoes back the applied settings.
- Assert `ManageGuild` check; unpermissioned caller → error.
- Assert defaults are applied for omitted fields.

---

### 4. `/note`

| Field | Value |
|---|---|
| **Slash name** | `/note` |
| **Prefix alias** | `!note` |
| **Description** | Attach a private moderator note to a user's moderation record without taking a public action. |
| **Target users** | mod |
| **Permissions required** | `ModerateMembers` |
| **Rate category** | `mod` |
| **Effort** | S |
| **Priority** | 4 |

**Example invocations**
```
/note user:@JohnDoe text:Warned verbally in #general about spoilers
/note user:987654321 text:Watch for coordinated behavior with 111222333
/note user:@JaneDoe text:Returning after previous ban—monitor closely
```

**Test vector summary**
- Assert note is written to `mod_notes` table with `author_id`, `target_id`, `guild_id`, `timestamp`, `text`.
- Assert note is ephemeral to the issuing mod (not visible to the target user).
- Assert `/history` command surfaces notes for the same target user.
- Assert `ModerateMembers` guard.
- Assert note text truncated to 1 000 chars with a warning.

---

### 5. `/history`

| Field | Value |
|---|---|
| **Slash name** | `/history` |
| **Prefix alias** | `!history` |
| **Description** | Display a paginated moderation history for a user, including warns, bans, kicks, mutes, and notes. |
| **Target users** | mod |
| **Permissions required** | `ModerateMembers` |
| **Rate category** | `mod` |
| **Effort** | M |
| **Priority** | 5 |

**Example invocations**
```
/history user:@JohnDoe
/history user:987654321 page:2
/history user:@JohnDoe type:ban
```

**Test vector summary**
- Assert paginated embed shows correct entries in reverse-chronological order.
- Assert `type` filter returns only the specified action type.
- Assert empty history returns a friendly "no records" embed.
- Assert `ModerateMembers` guard.
- Assert `page` out of range returns last valid page with a notice.

---

## Group 2: AI-Powered

### 6. `/ai summarize`

| Field | Value |
|---|---|
| **Slash name** | `/ai summarize` |
| **Prefix alias** | `!ai summarize` |
| **Description** | Fetch the last N messages from the current channel and return an AI-generated summary as an ephemeral embed. |
| **Target users** | mod, admin |
| **Permissions required** | `ManageMessages` |
| **Rate category** | `ai` (5 req / 60 s) |
| **Effort** | M |
| **Priority** | 4 |

**Example invocations**
```
/ai summarize count:50
/ai summarize count:100 format:bullet
/ai summarize count:25 channel:#announcements
```

**Test vector summary**
- Assert bot fetches exactly `count` messages via Discord API.
- Assert AI provider is called with correct prompt template.
- Assert output is capped at 2 000 chars; truncation note appended when exceeded.
- Assert `ManageMessages` guard.
- Assert AI provider timeout (> 10 s) returns a graceful error embed.

---

### 7. `/ai translate`

| Field | Value |
|---|---|
| **Slash name** | `/ai translate` |
| **Prefix alias** | `!ai translate` |
| **Description** | Translate a provided text or a replied-to message into any target language using the configured AI provider. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` (20 req / 60 s) |
| **Effort** | S |
| **Priority** | 3 |

**Example invocations**
```
/ai translate text:"Hola mundo" target_language:English
/ai translate text:"Bonjour" target_language:Japanese
/ai translate message_id:123456789 target_language:Spanish
```

**Test vector summary**
- Assert `message_id` resolves to message content before sending to AI.
- Assert result embed includes detected source language.
- Assert empty/whitespace `text` → validation error.
- Assert `target_language` not in supported list → friendly error with suggestions.
- Assert user rate-limit bucket enforced.

---

### 8. `/ai moderate`

| Field | Value |
|---|---|
| **Slash name** | `/ai moderate` |
| **Prefix alias** | `!ai moderate` |
| **Description** | Run an AI-assisted content moderation scan on the last N messages, flagging potentially policy-violating content. |
| **Target users** | admin |
| **Permissions required** | `ManageGuild` |
| **Rate category** | `admin` |
| **Effort** | L |
| **Priority** | 3 |

**Example invocations**
```
/ai moderate count:200 channel:#general
/ai moderate count:50 threshold:0.8
/ai moderate count:100 auto_delete:true
```

**Test vector summary**
- Assert AI moderation API is called once per message batch (not per message).
- Assert flagged messages above `threshold` are listed in the response embed.
- Assert `auto_delete:true` calls `message.delete()` for each flagged message.
- Assert results are logged to `ai_moderation_log` table.
- Assert `ManageGuild` guard.

---

### 9. `/ai persona set`

| Field | Value |
|---|---|
| **Slash name** | `/ai persona set` |
| **Prefix alias** | `!ai persona set` |
| **Description** | Configure a custom AI persona name and style (tone, greeting, restrictions) for all AI responses in this guild. |
| **Target users** | admin |
| **Permissions required** | `ManageGuild` |
| **Rate category** | `admin` |
| **Effort** | S |
| **Priority** | 2 |

**Example invocations**
```
/ai persona set name:Aria tone:friendly
/ai persona set name:Sentinel tone:formal restrictions:"no profanity"
/ai persona set reset:true
```

**Test vector summary**
- Assert persona config saved to `guild_settings.ai_persona` JSON column.
- Assert `reset:true` clears custom persona and applies defaults.
- Assert saved persona is used in subsequent `/ai summarize` system prompt.
- Assert `name` length ≤ 32 chars; validation error otherwise.
- Assert `ManageGuild` guard.

---

### 10. `/ai stats`

| Field | Value |
|---|---|
| **Slash name** | `/ai stats` |
| **Prefix alias** | `!ai stats` |
| **Description** | Display AI usage statistics for the guild: total calls, tokens used, provider costs, and top commands by AI usage. |
| **Target users** | admin |
| **Permissions required** | `ManageGuild` |
| **Rate category** | `admin` |
| **Effort** | S |
| **Priority** | 2 |

**Example invocations**
```
/ai stats
/ai stats period:7d
/ai stats period:30d breakdown:command
```

**Test vector summary**
- Assert embed includes total calls, total tokens, estimated cost.
- Assert `period` filter correctly scopes the query window.
- Assert `breakdown:command` shows per-command AI usage table.
- Assert zero-usage guilds return a "No AI usage yet" embed.
- Assert `ManageGuild` guard.

---

## Group 3: Economy Enhancement

### 11. `/auction create`

| Field | Value |
|---|---|
| **Slash name** | `/auction create` |
| **Prefix alias** | `!auction create` |
| **Description** | Create a timed auction for an in-bot item or currency amount, with configurable starting bid and duration. |
| **Target users** | admin |
| **Permissions required** | `ManageGuild` |
| **Rate category** | `economy` (30 req / 60 s) |
| **Effort** | L |
| **Priority** | 3 |

**Example invocations**
```
/auction create item:"Golden Badge" start_bid:500 duration:1h
/auction create item:"VIP Role" start_bid:1000 duration:24h
/auction create item:"500 coins" start_bid:100 duration:30m buyout:2000
```

**Test vector summary**
- Assert auction is persisted to `auctions` table with correct end timestamp.
- Assert bid message is posted to configured auction channel.
- Assert `buyout` price triggers immediate close when met.
- Assert expired auction triggers winner announcement and item transfer.
- Assert `ManageGuild` guard.

---

### 12. `/trade`

| Field | Value |
|---|---|
| **Slash name** | `/trade` |
| **Prefix alias** | `!trade` |
| **Description** | Propose a currency or item trade to another user; both parties must confirm before items transfer. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `economy` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/trade user:@Alice offer:200coins request:50coins
/trade user:@Bob offer:"Rare Badge" request:300coins
/trade user:@Carol offer:100coins request:"Lucky Charm"
```

**Test vector summary**
- Assert trade proposal creates a pending record and DMs target user.
- Assert both `accept` and `decline` buttons are rendered on the trade embed.
- Assert accepting transfers items atomically (no partial writes).
- Assert trade auto-cancels after 5 minutes with a timeout notice.
- Assert self-trade → validation error.

---

### 13. `/heist`

| Field | Value |
|---|---|
| **Slash name** | `/heist` |
| **Prefix alias** | `!heist` |
| **Description** | Launch a group heist event where participating members attempt to steal from the guild bank for a split payout. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `economy` |
| **Effort** | L |
| **Priority** | 3 |

**Example invocations**
```
/heist start stake:100
/heist join
/heist status
```

**Test vector summary**
- Assert only one active heist per guild at a time.
- Assert minimum participant count (configurable, default 3) before heist begins.
- Assert success/fail probability uses configured odds and participant count.
- Assert winners split payout, losers lose stake.
- Assert cooldown of 1 hour after heist concludes.

---

### 14. `/casino slots`

| Field | Value |
|---|---|
| **Slash name** | `/casino slots` |
| **Prefix alias** | `!slots` |
| **Description** | Play a slot machine mini-game for a wagered amount of in-bot currency with animated result display. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `economy` |
| **Effort** | M |
| **Priority** | 2 |

**Example invocations**
```
/casino slots bet:50
/casino slots bet:200
/casino slots bet:max
```

**Test vector summary**
- Assert `bet:max` resolves to the user's full balance.
- Assert wager is deducted before spin; winnings added on match.
- Assert animated emoji reel is rendered in embed before final result.
- Assert balance < bet → insufficient funds error.
- Assert RNG seed is logged for auditability.

---

### 15. `/streak`

| Field | Value |
|---|---|
| **Slash name** | `/streak` |
| **Prefix alias** | `!streak` |
| **Description** | View your current daily login streak and the bonus multiplier applied to economy rewards for maintaining the streak. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | S |
| **Priority** | 3 |

**Example invocations**
```
/streak
/streak user:@Alice
/streak leaderboard
```

**Test vector summary**
- Assert streak counter increments exactly once per calendar day.
- Assert streak resets to 0 when a day is missed.
- Assert multiplier table applied correctly at milestones (7, 14, 30, 100 days).
- Assert `leaderboard` shows top 10 streaks in the guild.
- Assert viewing another user's streak is read-only (no modification).

---

## Group 4: Community & Engagement

### 16. `/birthday set`

| Field | Value |
|---|---|
| **Slash name** | `/birthday set` |
| **Prefix alias** | `!birthday set` |
| **Description** | Store your birthday (month and day) so the bot can announce it in the configured channel on your special day. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | S |
| **Priority** | 3 |

**Example invocations**
```
/birthday set month:7 day:4
/birthday set month:12 day:25
/birthday set month:3 day:14 timezone:America/New_York
```

**Test vector summary**
- Assert birthday stored to `user_birthdays` with `guild_id`, `user_id`, `month`, `day`, `timezone`.
- Assert invalid date (e.g., Feb 30) → validation error.
- Assert daily cron job fires announcements on matching date in correct timezone.
- Assert re-setting overwrites previous entry.
- Assert announcement channel must be configured by admin; error if not set.

---

### 17. `/birthday list`

| Field | Value |
|---|---|
| **Slash name** | `/birthday list` |
| **Prefix alias** | `!birthday list` |
| **Description** | Show a list of server members whose birthdays fall within the current calendar month. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | S |
| **Priority** | 2 |

**Example invocations**
```
/birthday list
/birthday list month:12
/birthday list upcoming:7
```

**Test vector summary**
- Assert list is scoped to the current guild.
- Assert `month` parameter overrides current-month default.
- Assert `upcoming:7` returns birthdays within the next 7 days.
- Assert entries sorted by ascending day-of-month.
- Assert empty month → "No birthdays this month" embed.

---

### 18. `/events create`

| Field | Value |
|---|---|
| **Slash name** | `/events create` |
| **Prefix alias** | `!events create` |
| **Description** | Create a Discord scheduled event with title, description, start time, and optional voice channel. |
| **Target users** | admin |
| **Permissions required** | `ManageEvents` |
| **Rate category** | `admin` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/events create name:"Movie Night" start:"2025-08-15 20:00" channel:#movie-voice
/events create name:"Game Tournament" start:"2025-09-01 18:00" description:"Bring your best"
/events create name:"Q&A Session" start:"2025-07-20 19:00" external_url:https://twitch.tv/example
```

**Test vector summary**
- Assert Discord scheduled event is created via `guild.scheduledEvents.create`.
- Assert ISO 8601 and natural-language start-time parsing both work.
- Assert `external_url` sets event entity type to `EXTERNAL`.
- Assert `ManageEvents` guard.
- Assert past start time → validation error.

---

### 19. `/suggest`

| Field | Value |
|---|---|
| **Slash name** | `/suggest` |
| **Prefix alias** | `!suggest` |
| **Description** | Submit a suggestion that is posted to the configured suggestions channel with up/down vote reactions. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | S |
| **Priority** | 4 |

**Example invocations**
```
/suggest text:"Add a music trivia game"
/suggest text:"Create a weekly art contest" category:Events
/suggest text:"Allow custom role colors for boosters"
```

**Test vector summary**
- Assert suggestion is posted to the configured suggestions channel embed.
- Assert 👍 and 👎 reactions are auto-added.
- Assert `category` prepends a label to the embed title when provided.
- Assert suggestions channel not configured → admin-friendly setup prompt.
- Assert suggestion text length 10–2 000 chars enforced.

---

### 20. `/reputation give`

| Field | Value |
|---|---|
| **Slash name** | `/reputation give` |
| **Prefix alias** | `!rep give` |
| **Description** | Give one reputation point to another server member, limited to once per 24 hours per giver. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` (1 rep-give / 24 h) |
| **Effort** | S |
| **Priority** | 3 |

**Example invocations**
```
/reputation give user:@Alice reason:"Helped me with the setup guide"
/reputation give user:@Bob
/reputation give user:@Carol reason:"Amazing art post"
```

**Test vector summary**
- Assert `user_reputation` row is incremented for target.
- Assert giver cannot exceed 1 rep-give per 24 h per guild.
- Assert self-rep → validation error.
- Assert bot target → validation error.
- Assert `reason` is optional; stored if provided.

---

## Group 5: Music Enhancement

### 21. `/music shuffle`

| Field | Value |
|---|---|
| **Slash name** | `/music shuffle` |
| **Prefix alias** | `!shuffle` |
| **Description** | Randomly shuffle all tracks in the current playback queue, excluding the currently playing track. |
| **Target users** | all (must be in voice channel) |
| **Permissions required** | none (voice co-location required) |
| **Rate category** | `music` (10 req / 30 s) |
| **Effort** | S |
| **Priority** | 4 |

**Example invocations**
```
/music shuffle
/music shuffle seed:42
/music shuffle undo:true
```

**Test vector summary**
- Assert queue order changes after shuffle (Fisher-Yates algorithm).
- Assert now-playing track remains at index 0.
- Assert `undo:true` restores previous queue order from snapshot.
- Assert caller must be in the same voice channel as the bot.
- Assert empty queue (0 or 1 tracks) → "Nothing to shuffle" notice.

---

### 22. `/music save`

| Field | Value |
|---|---|
| **Slash name** | `/music save` |
| **Prefix alias** | `!music save` |
| **Description** | Save the current playback queue as a named playlist under the caller's account for future reuse. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `music` |
| **Effort** | M |
| **Priority** | 4 |

**Example invocations**
```
/music save name:"Chill Vibes"
/music save name:"Workout Mix" public:true
/music save name:"Night Drive" overwrite:true
```

**Test vector summary**
- Assert playlist saved to `playlists` table with tracks JSON array.
- Assert `public:true` makes playlist discoverable by other guild members.
- Assert `overwrite:true` updates existing playlist; without flag on duplicate name → error.
- Assert maximum 50 tracks per playlist; excess tracks truncated with warning.
- Assert empty queue → cannot save error.

---

### 23. `/music playlist load`

| Field | Value |
|---|---|
| **Slash name** | `/music playlist load` |
| **Prefix alias** | `!playlist load` |
| **Description** | Load a previously saved playlist into the current queue, appending or replacing based on the mode. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `music` |
| **Effort** | M |
| **Priority** | 4 |

**Example invocations**
```
/music playlist load name:"Chill Vibes"
/music playlist load name:"Workout Mix" mode:replace
/music playlist load user:@Alice name:"Night Drive"
```

**Test vector summary**
- Assert tracks are enqueued in Lavalink in correct order.
- Assert `mode:replace` clears current queue before loading.
- Assert `user:@Alice` resolves only public playlists from that user.
- Assert non-existent playlist → friendly "not found" error with suggestions.
- Assert bot must be in voice channel before loading.

---

### 24. `/music eq`

| Field | Value |
|---|---|
| **Slash name** | `/music eq` |
| **Prefix alias** | `!eq` |
| **Description** | Apply an equalizer preset to the current playback session: `bass-boost`, `flat`, `treble`, or `pop`. |
| **Target users** | all (must be in voice channel) |
| **Permissions required** | none |
| **Rate category** | `music` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/music eq preset:bass-boost
/music eq preset:flat
/music eq preset:pop
```

**Test vector summary**
- Assert Lavalink `equalizer` filter payload matches preset band config.
- Assert `flat` preset resets all bands to 0 gain.
- Assert EQ setting persists for duration of session (survives track skip).
- Assert caller must be in same voice channel.
- Assert unsupported preset name → validation error with list of valid presets.

---

### 25. `/music lyrics`

| Field | Value |
|---|---|
| **Slash name** | `/music lyrics` |
| **Prefix alias** | `!lyrics` |
| **Description** | Fetch and display lyrics for the currently playing track using the configured lyrics provider. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/music lyrics
/music lyrics query:"Bohemian Rhapsody Queen"
/music lyrics page:2
```

**Test vector summary**
- Assert current track title/artist is used when no `query` provided.
- Assert lyrics longer than 4 096 chars are paginated.
- Assert `page:N` loads the correct chunk.
- Assert no track playing and no `query` → error.
- Assert lyrics provider 404 → "Lyrics not found" embed with search-link fallback.

---

## Group 6: Utility & Tools

### 26. `/embed create`

| Field | Value |
|---|---|
| **Slash name** | `/embed create` |
| **Prefix alias** | `!embed create` |
| **Description** | Interactively build and post a custom Discord embed message to a specified channel. |
| **Target users** | admin |
| **Permissions required** | `ManageMessages` |
| **Rate category** | `admin` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/embed create title:"Welcome!" description:"Read the rules." color:#5865F2 channel:#welcome
/embed create title:"Announcement" description:"Server is back." thumbnail:https://example.com/img.png
/embed create title:"Rules" fields:"Rule 1|Be nice|Rule 2|No spam" channel:#rules
```

**Test vector summary**
- Assert `color` accepts hex and named colors; invalid value → validation error.
- Assert `fields` string is parsed into correct embed field objects.
- Assert embed is posted to the target `channel`, not the invoking channel.
- Assert `ManageMessages` guard (in target channel, not just any channel).
- Assert embed title ≤ 256 chars, description ≤ 4 096 chars enforced.

---

### 27. `/schedule`

| Field | Value |
|---|---|
| **Slash name** | `/schedule` |
| **Prefix alias** | `!schedule` |
| **Description** | Schedule a plain-text or embed message to be sent to a channel at a specified future time. |
| **Target users** | admin |
| **Permissions required** | `ManageMessages` |
| **Rate category** | `admin` |
| **Effort** | M |
| **Priority** | 4 |

**Example invocations**
```
/schedule channel:#announcements message:"Server maintenance in 1 hour" at:"2025-08-01 09:00 UTC"
/schedule channel:#general message:"Good morning!" at:"2025-08-02 08:00" recur:daily
/schedule list
```

**Test vector summary**
- Assert scheduled job is persisted to `scheduled_messages` table.
- Assert `recur:daily` creates a repeating job (cron expression stored).
- Assert `list` sub-command returns all pending scheduled messages for the guild.
- Assert past `at` time → validation error.
- Assert `/schedule cancel id:X` deletes the scheduled job.

---

### 28. `/tag`

| Field | Value |
|---|---|
| **Slash name** | `/tag` |
| **Prefix alias** | `!tag` |
| **Description** | Create server-specific quick-reply tags that any member can invoke to post pre-written content. |
| **Target users** | admin (create/delete), all (use) |
| **Permissions required** | `ManageMessages` (create/delete only) |
| **Rate category** | `user` |
| **Effort** | S |
| **Priority** | 4 |

**Example invocations**
```
/tag create name:rules content:"Please read #rules before posting."
/tag use name:rules
/tag list
```

**Test vector summary**
- Assert tag content stored in `guild_tags` table with `guild_id`, `name`, `content`, `author_id`.
- Assert `use` posts tag content to channel (not ephemeral).
- Assert `list` returns paginated tag names for the guild.
- Assert duplicate tag name → error with suggestion to use `overwrite` flag.
- Assert `ManageMessages` guard for create/delete; none required for use.

---

### 29. `/pin`

| Field | Value |
|---|---|
| **Slash name** | `/pin` |
| **Prefix alias** | `!pin` |
| **Description** | Pin a specific message by ID or by replying to it, with an optional reason logged to the audit entry. |
| **Target users** | mod |
| **Permissions required** | `ManageMessages` |
| **Rate category** | `mod` |
| **Effort** | S |
| **Priority** | 3 |

**Example invocations**
```
/pin message_id:1234567890123456789
/pin message_id:1234567890123456789 reason:"Community highlight"
/pin unpin message_id:1234567890123456789
```

**Test vector summary**
- Assert `message.pin()` is called on the resolved message.
- Assert `unpin` calls `message.unpin()`.
- Assert message not found → "Message not found" error embed.
- Assert channel pin limit (50) reached → error with list of oldest pins.
- Assert `ManageMessages` guard.

---

### 30. `/convert`

| Field | Value |
|---|---|
| **Slash name** | `/convert` |
| **Prefix alias** | `!convert` |
| **Description** | Convert values between units (length, weight, temperature, volume) or between currencies using live exchange rates. |
| **Target users** | all |
| **Permissions required** | none |
| **Rate category** | `user` |
| **Effort** | M |
| **Priority** | 3 |

**Example invocations**
```
/convert value:100 from:USD to:EUR
/convert value:5 from:km to:miles
/convert value:212 from:fahrenheit to:celsius
```

**Test vector summary**
- Assert unit conversions use exact formulas (not external API).
- Assert currency conversions fetch live rates from configured exchange API.
- Assert unknown unit → error embed listing valid units for the detected category.
- Assert negative temperature values convert correctly.
- Assert currency API timeout/failure falls back to cached rates with staleness notice.

---

## Summary Table

| # | Command | Group | Effort | Priority |
|---|---------|-------|--------|----------|
| 1 | `/massban` | Moderation | M | 5 |
| 2 | `/lockdown` | Moderation | M | 5 |
| 3 | `/antispam set` | Moderation | M | 4 |
| 4 | `/note` | Moderation | S | 4 |
| 5 | `/history` | Moderation | M | 5 |
| 6 | `/ai summarize` | AI | M | 4 |
| 7 | `/ai translate` | AI | S | 3 |
| 8 | `/ai moderate` | AI | L | 3 |
| 9 | `/ai persona set` | AI | S | 2 |
| 10 | `/ai stats` | AI | S | 2 |
| 11 | `/auction create` | Economy | L | 3 |
| 12 | `/trade` | Economy | M | 3 |
| 13 | `/heist` | Economy | L | 3 |
| 14 | `/casino slots` | Economy | M | 2 |
| 15 | `/streak` | Economy | S | 3 |
| 16 | `/birthday set` | Community | S | 3 |
| 17 | `/birthday list` | Community | S | 2 |
| 18 | `/events create` | Community | M | 3 |
| 19 | `/suggest` | Community | S | 4 |
| 20 | `/reputation give` | Community | S | 3 |
| 21 | `/music shuffle` | Music | S | 4 |
| 22 | `/music save` | Music | M | 4 |
| 23 | `/music playlist load` | Music | M | 4 |
| 24 | `/music eq` | Music | M | 3 |
| 25 | `/music lyrics` | Music | M | 3 |
| 26 | `/embed create` | Utility | M | 3 |
| 27 | `/schedule` | Utility | M | 4 |
| 28 | `/tag` | Utility | S | 4 |
| 29 | `/pin` | Utility | S | 3 |
| 30 | `/convert` | Utility | M | 3 |
