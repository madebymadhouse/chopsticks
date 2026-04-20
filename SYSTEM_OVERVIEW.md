# Chopsticks System Overview

## One Line

Chopsticks is a production Discord bot, open-source and self-hostable.

## What It Does

| Capability | Technology |
|------------|-----------|
| Music playback in Discord voice channels | Lavalink (Java audio server) |
| Server management and moderation | discord.js v14, 70+ slash commands |
| Economy, games, AI commands | PostgreSQL, Redis |
| Agent Pool (community bot tokens for voice) | WebSocket control plane |

## Stack

```
Discord API
    ↓
Chopsticks Bot (Node.js, discord.js v14)
    ↓
Lavalink (audio server)
    ↓
PostgreSQL + Redis (state and caching)
```

## Ecosystem Position

Chopsticks is a Mad House project. Repo: `madebymadhouse/chopsticks`.

## Key Contacts

- **Maintainer**: ws-sam
- **Community**: Egg Fried Rice Discord (`discord.gg/B7Bhuherkn`)

## For Agents

- Source code and infrastructure are in this repo.
- Read `CLAUDE.md` before making any changes.
