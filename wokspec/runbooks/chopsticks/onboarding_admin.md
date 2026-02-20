# Admin Onboarding Runbook — Chopsticks Discord Bot

> **Document type:** Runbook  
> **Audience:** Server administrators setting up Chopsticks for the first time  
> **Last updated:** 2025

---

## 1. One-Click Install Checklist

### Bot Invite URL

Use the following URL template to invite Chopsticks to your server. Replace `CLIENT_ID` with the application's client ID from the Discord Developer Portal.

```
https://discord.com/api/oauth2/authorize
  ?client_id=CLIENT_ID
  &permissions=8589934591
  &scope=bot%20applications.commands
```

> **Note:** The permissions integer above grants the standard set of required permissions. For a minimal-permissions install, use the table below instead and construct the integer with the Discord Permissions Calculator.

### Required OAuth2 Scopes

| Scope | Reason |
|---|---|
| `bot` | Allows the bot to join the server |
| `applications.commands` | Allows slash commands to be registered in the server |

### Required Bot Permissions

| Permission | Feature(s) using it |
|---|---|
| `Read Messages / View Channels` | All commands |
| `Send Messages` | All commands |
| `Embed Links` | All response embeds |
| `Add Reactions` | `/suggest`, `/heist`, economy events |
| `Manage Messages` | `/pin`, `/embed create`, `/schedule`, `/tag`, `/ai moderate` |
| `Manage Channels` | `/lockdown` |
| `Manage Roles` | Auto-role, `/setup` role configuration |
| `Ban Members` | `/massban` |
| `Kick Members` | Kick moderation actions |
| `Moderate Members` | `/note`, `/history`, timeout actions |
| `Manage Guild` | `/antispam set`, `/ai stats`, `/auction create` |
| `Manage Events` | `/events create` |
| `Connect` (Voice) | Music stack, voice AI features |
| `Speak` (Voice) | Music playback |
| `View Audit Log` | Moderation history correlation |

---

## 2. First-Time Setup: 10-Step Guide

### Step 1 — Run `/setup`

In any channel, invoke:
```
/setup
```
The bot will launch an interactive setup wizard that walks through all configuration steps. You may also complete each step manually using the commands below.

### Step 2 — Configure the Logging Channel

```
/config set mod_log_channel channel:#mod-log
```
All moderation actions (bans, kicks, mutes, notes) will be posted to this channel. Create a private channel visible only to staff before running this command.

### Step 3 — Set the Command Prefix

```
/config set prefix value:!
```
This sets the legacy prefix for users who prefer `!command` over slash commands. Default is `!`.

### Step 4 — Configure the Welcome System

```
/config set welcome_channel channel:#welcome
/config set welcome_message value:"Welcome to {server}, {user}! Please read the rules."
```
`{user}` is replaced with the new member's mention; `{server}` with the server name.

### Step 5 — Set Up Moderation Roles

```
/config set mod_role role:@Moderator
/config set admin_role role:@Admin
```
These roles determine who can use moderation commands (`/note`, `/history`, `/lockdown`, etc.) when the user does not have the corresponding Discord permission directly.

### Step 6 — Enable Auto-Role

```
/config set autorole role:@Member
```
New members will automatically receive the `@Member` role on join, allowing them to see and use member-only channels.

### Step 7 — Configure Starboard

```
/config set starboard_channel channel:#starboard
/config set starboard_threshold value:5
```
Messages that receive 5 or more ⭐ reactions will be reposted to `#starboard`.

### Step 8 — Set Up Tickets

```
/config set ticket_category category:Support
/config set ticket_log_channel channel:#ticket-log
/tickets panel channel:#support-info
```
This creates a ticket-opening panel in `#support-info` and routes new tickets to channels inside the "Support" category.

### Step 9 — Configure Rate-Limit Overrides (Optional)

If your server has very active usage and the default rate limits are too restrictive:
```
/ratelimit override bucket:user limit:40 window_seconds:60
/ratelimit override bucket:economy limit:50 window_seconds:60
```
Consult the rate-limit documentation before increasing limits significantly.

### Step 10 — Deploy a Test Command

Run a quick end-to-end test to verify the setup is working:
```
/ping
```
The bot should respond with its current latency. Then run:
```
/suggest text:"Test suggestion — setup complete"
```
Verify the suggestion appears in the configured suggestions channel with ✅ and ❌ reactions.

---

## 3. Common Admin Commands — Quick Reference

| Command | Purpose | Example |
|---|---|---|
| `/config set` | Set any guild configuration value | `/config set prefix value:?` |
| `/config view` | View all current guild settings | `/config view` |
| `/lockdown` | Lock all channels in a category | `/lockdown category:General duration:30m` |
| `/antispam set` | Configure anti-spam thresholds | `/antispam set burst_limit:5 window_ms:3000` |
| `/massban` | Ban multiple users at once | `/massban users:111 222 333 reason:raid` |
| `/embed create` | Post a custom embed to a channel | `/embed create title:"Welcome" channel:#welcome` |
| `/schedule` | Schedule a future message | `/schedule channel:#general message:"Event starts!" at:"2025-08-01 18:00"` |
| `/tag create` | Create a quick-reply tag | `/tag create name:rules content:"See #rules"` |
| `/events create` | Create a Discord scheduled event | `/events create name:"Movie Night" start:"2025-08-10 20:00"` |
| `/auction create` | Start a timed auction | `/auction create item:"VIP Role" start_bid:1000 duration:24h` |
| `/ai persona set` | Set a custom AI persona for the guild | `/ai persona set name:Aria tone:friendly` |
| `/ai stats` | View AI usage statistics | `/ai stats period:30d` |
| `/ai moderate` | Run an AI moderation scan | `/ai moderate count:100 channel:#general` |
| `/ratelimit override` | Override rate limits for a bucket | `/ratelimit override bucket:user limit:40` |
| `/history` | View a user's moderation history | `/history user:@JohnDoe` |
| `/note` | Add a private mod note to a user | `/note user:@JohnDoe text:Watch this user` |
| `/pin` | Pin a message by ID | `/pin message_id:123456789 reason:"Community highlight"` |
| `/setup` | Run the interactive setup wizard | `/setup` |
