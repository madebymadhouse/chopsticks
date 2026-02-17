# 🥢 Chopsticks Bot - Modern Tech Stack (2025)

## 🚀 What's New

### **Enterprise-Grade Security Stack**
- **Helmet.js** - Secure HTTP headers (CSP, HSTS, XFO, etc.)
- **Rate-limiter-flexible** - Redis-backed distributed rate limiting
  - Per-user, per-command limits
  - Sensitive action protection (3 attempts/5min)
  - Automatic IP blocking on abuse
- **Joi & Zod** - Type-safe input validation
- **HPP** - HTTP Parameter Pollution prevention
- **Bcrypt** - Secure password hashing
- **Compression** - Brotli/Gzip response compression

### **Observability & Monitoring**
- **Pino** - Structured logging (40x faster than Winston)
- **Prometheus** - Metrics collection
  - Command execution metrics
  - Economy transaction tracking
  - Agent pool health monitoring
  - Database query performance
  - Discord API rate limit tracking
- **Grafana** - Real-time dashboards
- **Loki** - Centralized log aggregation
- **OpenTelemetry** - Distributed tracing (ready for microservices)

### **Audio Excellence**
- **@discordjs/opus** - Native Opus encoding (best performance)
- **sodium-native** - Encryption for voice streams
- **@snazzah/davey** - DAVE protocol (Discord's e2ee voice)
- **Lavalink 4.0** - High-performance audio streaming

### **Economy System**
- Full DankMemer-inspired engagement system
- PostgreSQL with atomic transactions
- Redis-backed cooldowns
- Streak multipliers (up to 3.0x)
- Comprehensive item system (tools, consumables, collectibles)
- Collection/Gathering mechanic with rarity tiers
- Vault system for showcasing rare items

---

## 📊 Monitoring Stack

### Start Monitoring Infrastructure
```bash
npm run monitoring:up
```

### Access Points
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100

### Metrics Exposed
- `/metrics` - Prometheus scrape endpoint
- `/health` - Health check endpoint

### Key Metrics
```
chopsticks_commands_total - Total commands executed
chopsticks_command_duration_seconds - Command latency histogram
chopsticks_economy_transactions_total - Economy activity
chopsticks_music_voice_connections_active - Active voice connections
chopsticks_agent_pool_size_total - Total agents in pool
chopsticks_rate_limit_hits_total - Rate limit violations
chopsticks_db_query_duration_seconds - Database performance
```

---

## 🛡️ Security Features

### Rate Limiting

**Command Rate Limits** (per user, per command):
- Default: 10 requests/second
- Automatic exponential backoff
- 60-second block on violation

**Sensitive Actions**:
- 3 attempts per 5 minutes
- 1-hour block on excessive failures
- Applies to: token operations, admin actions, OAuth

### Dashboard Security
- Helmet.js with strict CSP
- CORS whitelisting
- Admin-only endpoints with audit logging
- Session stored in Redis
- HTTPS-only cookies in production

### Input Validation
```javascript
import { validateCommandInput, schemas } from "./utils/validation.js";

// In your command
const validated = await validateCommandInput(interaction, {
  amount: schemas.credits,
  user: schemas.userId
});
```

---

## 🎵 Music System

### Lavalink Configuration
The bot uses Lavalink for high-quality audio streaming:
- 24-bit/48kHz Opus encoding
- Multiple source support (YouTube, Spotify, SoundCloud)
- Advanced filters (bassboost, nightcore, 8D)
- Queue management

### Agent Pool for Music
- Agents deployed from pool for multi-channel support
- Automatic agent allocation
- Health monitoring and auto-restart
- Encrypted token storage (AES-256-GCM)

---

## 💰 Economy Commands

### Wallet Management
- `/balance [user]` - View Credits balance
- `/daily` - Claim daily reward (streak bonuses)
- `/pay <user> <amount>` - Transfer Credits
- `/bank deposit|withdraw|view` - Bank operations

### Earning Credits
- `/work <job>` - Work jobs (Code Review, DJ Gig, Data Mining, Market Trading)
- `/gather [tool]` - Gather collectible items

### Inventory
- `/inventory [page]` - View your items
- `/use <item>` - Consume items (buffs, companions, etc.)
- `/collection [filter]` - View gathered collections
- `/vault` - Showcase rare items

---

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Run Bot
```bash
# Development
npm run bot

# Production (Docker)
docker compose -f docker-compose.production.yml up -d
```

### Deploy Commands
```bash
# Global deployment (takes ~1 hour to propagate)
npm run deploy:global

# Guild-specific (instant)
GUILD_ID=YOUR_GUILD_ID npm run deploy:guild
```

### Monitoring
```bash
# Start monitoring stack
npm run monitoring:up

# View logs
npm run monitoring:logs

# Stop monitoring
npm run monitoring:down
```

---

## 📦 Package Highlights

### Security (13 packages)
- helmet, express-rate-limit, rate-limiter-flexible
- joi, zod, express-validator, bcrypt
- hpp, cors, compression, @sentry/node
- sodium-native, @snazzah/davey

### Monitoring (6 packages)
- pino, pino-pretty
- prom-client
- @opentelemetry/sdk-node
- @opentelemetry/auto-instrumentations-node
- clinic, autocannon

### Audio (3 packages)
- @discordjs/opus (native performance)
- prism-media
- lavalink-client

### Database
- ioredis (replacing redis for better performance)
- pg (PostgreSQL)

---

## 🎯 Roadmap

### Phase 2 Complete ✅
- [x] Collections system with rarity tiers
- [x] Gathering mechanic with tools
- [x] Vault showcase system
- [x] Work command with 4 job types
- [x] Full inventory system

### Phase 3 (Next)
- [ ] Companions (agent-themed pets)
- [ ] Companion training and skills
- [ ] Companion breeding
- [ ] Stasis mode

### Phase 4
- [ ] Marketplace (buy/sell/trade)
- [ ] Leaderboards (wealth, collections, companions)
- [ ] Battles with wagers
- [ ] Achievements

### Phase 5
- [ ] Premium subscriptions
- [ ] Cosmetic skins/chassis
- [ ] Seasonal events
- [ ] Voice model integration (ElevenLabs, custom AI)

---

## 🏗️ Architecture

### Microservices Ready
- Bot service (main process)
- Agent pool service (separate process)
- Dashboard API (Express)
- Monitoring stack (Prometheus/Grafana/Loki)

### Database
- **PostgreSQL** - Primary data store
  - User wallets, inventory, companions
  - Agent pool registry
  - Transaction logs
  - Audit trails
- **Redis** - Caching & sessions
  - Rate limiting
  - Cooldowns
  - Music search cache
  - Session storage

---

## 📈 Performance

### Logging
- **Pino** is 40x faster than Winston
- Structured JSON logs for easy parsing
- Separate loggers per subsystem

### Rate Limiting
- Distributed (Redis-backed)
- Supports horizontal scaling
- Per-user, per-IP, and global limits

### Audio
- Native Opus encoding (C++ bindings)
- Lower CPU usage than pure JS implementations
- Support for 24-bit/48kHz streaming

---

## 🔐 Environment Variables

```env
# Core
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
POSTGRES_URL=postgresql://user:pass@localhost:5432/chopsticks
REDIS_URL=redis://localhost:6379

# Security
AGENT_TOKEN_KEY=64_char_hex_key
DASHBOARD_SESSION_SECRET=random_secret
DASHBOARD_ADMIN_IDS=comma_separated_user_ids
DASHBOARD_COOKIE_SECURE=true

# Monitoring
LOG_LEVEL=info
NODE_ENV=production

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=strong_password
GRAFANA_ROOT_URL=https://your-domain.com

# OAuth
DISCORD_CLIENT_SECRET=your_oauth_secret
DISCORD_REDIRECT_URI=https://your-domain.com/oauth/callback
```

---

## 🚨 Alerts & Notifications

Prometheus alerts configured for:
- High command error rate (>5%)
- High command latency (>5s p95)
- Agent pool exhaustion (<3 available)
- Database connection pool saturation (>80%)
- Redis connection failures
- Discord API rate limits hit

Configure webhooks in Grafana to send alerts to Discord/Slack/PagerDuty.

---

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

See CONTRIBUTING.md

---

**Built with ❤️ for production scale. No fluff, just power.**
