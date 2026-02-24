# Self-Hosting & Reskinning Chopsticks

Chopsticks is fully self-hostable. This guide covers running your own instance, rebranding it, and customizing every aspect of its behavior without touching core logic.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20 or 22 LTS |
| Docker + Compose | v2+ |
| PostgreSQL | 15+ (or use Docker) |
| Redis | 7+ (or use Docker) |

---

## Quick Start (Docker)

```bash
git clone https://github.com/WokSpec/Chopsticks.git
cd Chopsticks
cp .env.example .env
# Edit .env — fill in DISCORD_TOKEN, CLIENT_ID, BOT_OWNER_IDS at minimum
docker compose -f docker-compose.free.yml up -d
```

See `docker-compose.free.yml` for the minimal free-tier stack. Use `docker-compose.production.yml` for a hardened production deployment.

---

## Rebranding (Fork / White-Label)

All brand text, default colors, and feature flags are controlled by two files:

### 1. `src/config/branding.js`

Edit this file to change the bot's name, tagline, support server link, website, and default color palette for your fork:

```js
// src/config/branding.js
export const Branding = {
  name:          "MyBot",
  tagline:       "My custom Discord bot",
  supportServer: "https://discord.gg/myserver",
  inviteUrl:     "https://discord.com/api/oauth2/authorize?...",
  website:       "https://mybot.example.com",
  github:        "https://github.com/yourname/mybot",
  footerText:    "{botname} • mybot.example.com",

  colors: {
    primary: 0xFF5733,  // your brand color
    success: 0x57F287,
    error:   0xED4245,
    warning: 0xFEE75C,
    info:    0x5865F2,
    neutral: 0x99AAB5,
    premium: 0xFF73FA,
    music:   0x1DB954,
  },

  features: {
    economy:      true,
    music:        true,
    ai:           true,
    leveling:     true,
    voicemaster:  true,
    tickets:      true,
    moderation:   true,
    fun:          true,
    social:       true,
    notifications: true,
  },
};
```

### 2. Environment variables (`.env`)

Every `branding.js` value can also be set via environment variable — no code edits required for basic rebranding:

```env
BOT_NAME=MyBot
BOT_TAGLINE=My custom Discord bot
BOT_FOOTER={botname} • v2.0
COLOR_PRIMARY=16734003
FEATURE_ECONOMY=false
```

See the **Branding / Reskin** section of `.env.example` for the full list.

---

## Per-Server Customization (no fork needed)

Server admins can customize how Chopsticks looks and behaves in their server using `/theme`:

| Command | Effect |
|---|---|
| `/theme color primary #FF5733` | Change the primary embed color |
| `/theme color success #00FF00` | Change success embed color |
| `/theme name MyBot` | Rename the bot persona for this server |
| `/theme footer "Powered by MyBot"` | Set a custom embed footer |
| `/theme feature economy disable` | Disable the economy module in this server |
| `/theme preview` | Show current server theme |
| `/theme reset` | Reset all customizations to bot defaults |

Colors, persona name, footer, and feature toggles are all per-guild and persist across restarts.

---

## Disabling Features

### Globally (all servers)

In `.env` or `branding.js`:

```env
FEATURE_MUSIC=false
FEATURE_ECONOMY=false
FEATURE_AI=false
```

### Per server

```
/theme feature music disable
/theme feature economy disable
```

---

## Adding Custom Commands (no code)

Use `/customcmd create` to add server-specific text commands that trigger on prefix:

```
/customcmd create name:rules response:Read our rules at {server}/rules!
/customcmd create name:discord response:Join our Discord: https://discord.gg/...
```

Supported variables: `{user}`, `{username}`, `{server}`, `{membercount}`, `{args}`, `{arg[0]}`, `{random:a|b|c}`

---

## Plugin Architecture

Drop new command files into `src/commands/` — they are auto-loaded at startup. Requirements:

```js
// src/commands/mycommand.js
import { SlashCommandBuilder } from "discord.js";

export const meta = {
  category: "utility",  // required
  deployGlobal: true,
};

export const data = new SlashCommandBuilder()
  .setName("mycommand")
  .setDescription("Does something");

export async function execute(interaction) {
  await interaction.reply("Hello!");
}
```

Drop new event handlers into `src/events/` — they are auto-loaded:

```js
// src/events/myevent.js
export default {
  name: "guildMemberAdd",  // discord.js event name
  async execute(member) {
    // your logic
  },
};
```

Run `DEPLOY_MODE=global node scripts/deployCommands.js` after adding commands.

---

## Deploying Commands

```bash
# Deploy slash commands globally (available in all servers after ~1 hour)
DEPLOY_MODE=global node scripts/deployCommands.js

# Deploy to a single test guild instantly
DEPLOY_MODE=guild GUILD_ID=YOUR_GUILD_ID node scripts/deployCommands.js
```

---

## Environment Variables Reference

See `.env.example` for the full list. Key variables:

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal |
| `CLIENT_ID` | Bot application client ID |
| `BOT_OWNER_IDS` | Comma-separated owner Discord user IDs |
| `STORAGE_DRIVER` | `postgres` (recommended) or `file` |
| `POSTGRES_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BOT_NAME` | Bot display name in embeds |
| `COLOR_PRIMARY` | Default embed color (decimal integer) |
| `FEATURE_*` | Enable/disable feature modules globally |
| `CONFESSION_SECRET` | Secret for encrypting confession author IDs |
| `TWITCH_CLIENT_ID` | Twitch Helix API client ID (for `/notify`) |
| `TWITCH_CLIENT_SECRET` | Twitch Helix API secret |

---

## License

Chopsticks is released under the [MIT License](LICENSE). You are free to fork, modify, and deploy your own instance. Attribution appreciated but not required.
