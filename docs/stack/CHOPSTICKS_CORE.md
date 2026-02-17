# Chopsticks - The Master Bot

## 🎯 THE ARCHITECTURE (CORRECTED)

**CRITICAL CONSTRAINT: Discord allows maximum 50 bots per server**

```
┌─────────────────────────────────────────────────────────────────┐
│                  GLOBAL AGENT POOL                              │
│              (50,000+ Bot Tokens Total)                         │
│                                                                  │
│  This is the SHARED pool across ALL servers                    │
│  Agents are assigned dynamically to servers as needed          │
│                                                                  │
│  Agent #00001  Agent #00002  Agent #00003  ...  Agent #50000  │
└─────────────────────────────────────────────────────────────────┘
                          ↓ DISTRIBUTES TO ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER A (Guild 123)                         │
│                                                                  │
│  Chopsticks Bot (1 slot)                                       │
│  + Up to 49 agents from pool:                                  │
│    - Agent #00042 (music)                                      │
│    - Agent #00127 (moderation)                                 │
│    - Agent #00891 (AI companion)                               │
│    - Agent #01234 (economy games)                              │
│    - ... up to 45 more if needed                               │
│                                                                  │
│  LIMIT: 50 total bots (Chopsticks + 49 agents)                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SERVER B (Guild 456)                         │
│                                                                  │
│  Chopsticks Bot (1 slot)                                       │
│  + Different agents from same pool:                             │
│    - Agent #00013 (music)                                      │
│    - Agent #00551 (AI companion)                               │
│    - ... up to 47 more if needed                               │
│                                                                  │
│  LIMIT: 50 total bots (Chopsticks + 49 agents)                │
└─────────────────────────────────────────────────────────────────┘

... and so on for 1,000,000+ servers
```

**How Pool Distribution Works:**
- **Global Pool:** 50,000 bot tokens managed centrally
- **Per Server:** Each server can use up to 49 agents (Discord limit)
- **Dynamic Assignment:** Agents from pool assigned to servers on-demand
- **Reuse:** Same agent can serve multiple servers (in different channels/guilds)
- **Scale:** 50,000 agents can serve 1,000,000+ servers if distributed efficiently

**Example at Scale:**
```
50,000 agents ÷ 1 agent per server average = 50,000 servers covered
50,000 agents ÷ 2 agents per server average = 25,000 servers covered
50,000 agents ÷ 5 agents per server average = 10,000 servers covered

If most servers only need 1-2 agents (music + maybe one more):
50,000 agents can serve 25,000-50,000 servers concurrently

Servers not actively using agents = agents return to pool
Peak usage optimization needed for scale to 1M servers
```

---

## 🔥 CHOPSTICKS CORE BOT - FEATURE SET

### 1. Music System ✅ (ALREADY BUILT)
**Status:** Operational, needs hardening  
**How it works:** 
- User runs `/play` → Chopsticks deploys agent from pool → Agent joins voice and plays music
- **Agents are REQUIRED** for music (can't play without them)

**Features:**
- Play from YouTube, Spotify, SoundCloud
- Queue management (add, remove, shuffle, move)
- Playback controls (pause, resume, skip, seek)
- Filters & effects
- Now playing graphics (Canvas)
- Lyrics display
- 24/7 radio mode
- Playlist management

**Commands:**
- `/play` - Chopsticks deploys music agent to play
- `/queue` - Show queue for deployed agent
- `/skip` - Skip track on deployed agent
- `/pause` - Pause deployed agent's playback
- `/resume` - Resume deployed agent's playback
- `/stop` - Stop agent and release back to pool
- `/volume` - Adjust agent's volume
- `/nowplaying` - Show what agent is playing
- `/lyrics` - Display lyrics from agent

**Architecture:**
```
User: /play never gonna give you up
  ↓
Chopsticks: Deploys Agent #0042 to this guild
  ↓
Agent #0042: Joins voice channel, searches YouTube, plays audio
  ↓
Chopsticks: Monitors Agent #0042, handles queue, manages session
```

---

### 2. Moderation System 🚧 (TO BUILD)
**Priority:** HIGH  
**How it works:** Two options:
- **Option A:** Chopsticks handles moderation directly (no agent needed)
- **Option B:** User deploys dedicated mod agent for advanced features

**Features:**
- User management (ban, kick, timeout, warn)
- Message management (purge, bulk delete)
- Auto-moderation (spam, links, caps, profanity)
- Raid protection (verification gates, anti-spam)
- Logging system (all mod actions logged)
- Warning system (escalating punishments)
- Appeal system (users can appeal bans)
- Role management (add/remove roles, temp roles)
- Channel lockdown (emergency lock)
- Verification system (captcha, reaction roles)

**Architecture Options:**
```
OPTION A (Default - No Agent Required):
User: /mod ban @user
  ↓
Chopsticks: Executes ban directly
  ↓
Chopsticks: Logs action to database

OPTION B (Advanced - Dedicated Mod Agent):
User: /mod ban @user
  ↓
Chopsticks: Sends command to deployed mod agent
  ↓
Mod Agent: Executes ban, monitors automod, logs everything
  ↓
Chopsticks: Receives logs, updates database
```

**Why deploy a mod agent?**
- Real-time automoderation (spam, links, etc.)
- Faster response times
- Can monitor all messages independently
- Can act even if Chopsticks is offline
- Dedicated permissions

**Commands:**
```
/mod ban <user> [reason] [duration]
/mod kick <user> [reason]
/mod timeout <user> <duration> [reason]
/mod warn <user> <reason>
/mod warnings <user>
/mod unwarn <user> <warning_id>
/mod purge <count> [filter]
/mod lock <channel> [reason]
/mod unlock <channel>
/mod slowmode <channel> <seconds>
/mod role add <user> <role> [duration]
/mod role remove <user> <role>
/mod appeal <case_id> <response>

/automod setup
/automod enable <filter>
/automod disable <filter>
/automod config <filter> <settings>
/automod test

/raid enable
/raid disable
/raid config <threshold>
```

**Auto-Moderation Filters:**
- Spam detection (message frequency, duplicate content)
- Link filtering (block all links, whitelist only)
- Invite links (block Discord invites)
- Caps detection (excessive caps)
- Profanity filter (customizable word list)
- Mass mention protection
- Zalgo text filtering
- Emoji spam detection

**Logging Events:**
- Message delete/edit
- User join/leave
- User ban/kick/timeout
- Role changes
- Channel changes
- Server settings changes
- Voice state changes

---

### 3. Economy & Games System 🚧 (TO BUILD)
**Priority:** HIGH  
**Features:**
- Currency system (coins, customizable name)
- Banking (balance, deposit, withdraw, transfer)
- Daily/weekly rewards
- Work system (earn coins)
- Rob system (steal from others)
- Inventory system (items, collectibles)
- Shop system (buy/sell items)
- Trading system (user-to-user trades)
- Casino games (slots, blackjack, roulette, dice, coin flip)
- Minigames (trivia, hangman, connect4, tictactoe)
- Betting system (bet on outcomes)
- Leaderboards (richest users, gamblers)

**Commands:**
```
/balance [user]
/daily
/weekly
/work
/transfer <user> <amount>
/deposit <amount>
/withdraw <amount>
/rob <user>

/shop list [category]
/shop buy <item> [quantity]
/shop sell <item> [quantity]
/inventory [user]
/trade <user>

/slots <bet>
/blackjack <bet>
/roulette <bet> <choice>
/dice <bet> <guess>
/coinflip <bet> <heads|tails>

/trivia [category]
/hangman
/connect4 <opponent>
/tictactoe <opponent>

/leaderboard coins
/leaderboard wins
/leaderboard level
```

**Economy Configuration:**
```
/economy setup
/economy config currency_name <name>
/economy config currency_symbol <symbol>
/economy config starting_balance <amount>
/economy config daily_reward <amount>
/economy config work_min <amount>
/economy config work_max <amount>
/economy config rob_success_rate <percentage>
```

---

### 4. Leveling & XP System 🚧 (TO BUILD)
**Priority:** HIGH  
**Features:**
- XP system (message-based, voice-based, custom)
- Level calculation & progression
- Role rewards (unlock roles at levels)
- Leaderboards (server, global)
- XP multipliers (boosts, events)
- Custom XP sources (reactions, commands)
- Prestige system (reset for rewards)
- Rank cards (Canvas graphics)
- Level-up messages (customizable)
- XP cooldowns (anti-spam)

**Commands:**
```
/rank [user]
/leaderboard [page]
/levels config
/levels rewards
/levels rewards add <level> <role>
/levels rewards remove <level>
/levels multiplier <user> <multiplier> [duration]
/levels reset <user>
/levels prestige
```

**Configuration:**
```
/levels config xp_per_message <min> <max>
/levels config xp_cooldown <seconds>
/levels config voice_xp <per_minute>
/levels config level_formula <formula>
/levels config levelup_message <message>
/levels config levelup_channel <channel>
/levels config ignored_channels <channels>
/levels config ignored_roles <roles>
```

---

### 5. Custom Commands & Automation 🚧 (TO BUILD)
**Priority:** MEDIUM  
**Features:**
- Custom text commands
- Embed commands
- Button commands (interactive)
- Auto-responses (trigger-based)
- Scheduled messages
- Welcome/goodbye messages
- Reaction roles
- Polls (single, multi-choice, ranked)
- Giveaways
- Announcements

**Commands:**
```
/custom add <name> <response>
/custom remove <name>
/custom edit <name> <new_response>
/custom list

/autoresponse add <trigger> <response>
/autoresponse remove <trigger>
/autoresponse list

/reactionrole setup <message> <emoji> <role>
/reactionrole remove <message> <emoji>

/poll create <question> <options>
/giveaway start <prize> <duration> [winners]
/announce <channel> <message> [time]

/welcome config message <message>
/welcome config channel <channel>
/goodbye config message <message>
/goodbye config channel <channel>
```

---

### 6. Utility System 🚧 (TO BUILD)
**Priority:** MEDIUM  
**Features:**
- Server info
- User info
- Role info
- Avatar display
- Reminders (personal, channel)
- Timers (countdown, stopwatch)
- Sticky messages
- Message pinning
- AFK system
- Polls
- Suggestions system
- Ticket system

**Commands:**
```
/serverinfo
/userinfo [user]
/roleinfo <role>
/avatar [user]

/remind <duration> <message>
/reminders list
/reminders cancel <id>

/timer <duration> [message]
/afk [reason]
/afk remove

/sticky set <channel> <message>
/sticky remove <channel>

/suggest <suggestion>
/suggestions config
/ticket create [reason]
/ticket close [reason]
```

---

### 7. Analytics & Reporting 🚧 (TO BUILD)
**Priority:** MEDIUM  
**Features:**
- Server statistics (members, messages, activity)
- User statistics (activity, rankings)
- Channel analytics (usage, peak times)
- Growth tracking (joins, leaves, retention)
- Moderation reports (actions, trends)
- Economy reports (circulation, wealth distribution)
- Custom metrics tracking
- Graphic generation (Canvas charts, cards)
- Export reports (CSV, JSON, PDF)

**Commands:**
```
/stats server [days]
/stats user [user] [days]
/stats channel [channel] [days]
/stats growth [days]
/stats moderation [days]
/stats economy [days]

/analytics config
/analytics export <type>
/analytics dashboard
```

---

### 8. Voice Features 🚧 (TO BUILD)
**Priority:** LOW (after core features)  
**Features:**
- Text-to-speech (basic Piper)
- Voice recording
- Soundboard
- Temp voice channels (VoiceMaster clone)
- Voice channel permissions
- Voice activity tracking

**Commands:**
```
/tts <message> [voice]
/soundboard list
/soundboard play <sound>
/soundboard add <name> <file>

/voicemaster setup
/voicemaster config
/voice create [name] [limit]
/voice lock
/voice unlock
/voice transfer <user>
```

---

### 9. Agent Pool Management System ✅🚧 (PARTIALLY BUILT)
**Priority:** HIGH  
**Features:**
- Agent token management (already built)
- Pool creation & configuration (already built)
- Agent deployment (needs enhancement)
- Agent configuration UI (needs building)
- Agent monitoring & analytics (needs building)
- Token health checking (already built)
- Automatic failover (already built)

**Commands:**
```
/agents list                     ✅ DONE
/agents deploy                   ✅ DONE
/agents remove                   ✅ DONE
/agents pool_create              ✅ DONE
/agents pool_list                ✅ DONE
/agents pool_info                ✅ DONE
/agents sessions                 ✅ DONE

/agents configure <agent>        🚧 TO BUILD (agent configuration UI)
/agents analytics <agent>        🚧 TO BUILD (usage stats)
/agents marketplace              🚧 TO BUILD (template marketplace)
/agents template save            🚧 TO BUILD (save configuration as template)
/agents template load            🚧 TO BUILD (load template)
```

---

### 10. Web Dashboard 🚧 (TO BUILD)
**Priority:** HIGH  
**Features:**
- Server settings management
- Agent configuration interface
- Analytics visualization
- User management
- Module enable/disable
- Permission management
- Audit logs
- Billing & subscription management

**Pages:**
```
/dashboard/home                  - Overview, quick stats
/dashboard/modules               - Enable/disable features
/dashboard/moderation            - Mod settings, logs, appeals
/dashboard/economy               - Economy config, shop management
/dashboard/levels                - Level config, rewards
/dashboard/agents                - Agent management & configuration
/dashboard/agents/:id/configure  - Visual agent configuration UI
/dashboard/analytics             - Charts, graphs, reports
/dashboard/settings              - Server settings
/dashboard/billing               - Subscription & payment
```

---

## 🎮 USER JOURNEY

### Step 1: Add Chopsticks Bot
```
1. User invites Chopsticks to their server
2. Chopsticks sends welcome message with setup guide
3. Chopsticks creates default configuration
4. Chopsticks verifies it has agent pool access
```

### Step 2: First Music Command (Automatic Agent Deployment)
```
User runs: /play never gonna give you up

Chopsticks:
"🎵 Deploying music agent... (first time setup)"
[Deploys Agent #0042 from pool to this guild]
"✅ Agent deployed! Searching for: never gonna give you up"
[Agent #0042 joins voice, plays music]

From now on:
- /play commands use Agent #0042
- Agent stays deployed to this guild
- Agent handles all music for this server
```

### Step 3: Use Other Chopsticks Features
```
These work through Chopsticks directly (no agent needed):
- /mod ban @user - Chopsticks handles it
- /balance - Chopsticks checks database
- /rank - Chopsticks generates rank card
- /serverinfo - Chopsticks provides info

These work fine without deploying extra agents.
```

### Step 4: (Optional) Deploy Additional Agents
```
User wants more agents for:
- Multiple music bots (different channels)
- Dedicated mod agent (real-time automod)
- AI companion agent (chat in server)
- Economy agent (runs casino games)

User runs: /agents deploy

Chopsticks:
"What should this agent do?"
⚪ Music (another music bot)
⚪ Moderation (dedicated mod agent)
⚪ AI Companion (chat agent)
⚪ Custom (configure yourself)

User selects "AI Companion"

Chopsticks:
"✅ Deploying AI Companion Agent #0043
Go to dashboard to configure personality"
```

### Step 5: Configure Advanced Agents
```
User goes to web dashboard:

1. Click on "Agent #0043"
2. Set personality profile
3. Enable AI (GPT-4)
4. Configure behavior (when to respond)
5. Set voice model (optional)
6. Click "Save & Activate"

Agent #0043 now acts like a real person in the server.
```

---

## 🏗️ ARCHITECTURE

### Chopsticks Main Bot Process:
```javascript
// src/index.js - Main Chopsticks bot

const ChopsticksBot = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

// Core systems
const musicSystem = new MusicSystem();          // ✅ DONE
const moderationSystem = new ModerationSystem(); // 🚧 TO BUILD
const economySystem = new EconomySystem();      // 🚧 TO BUILD
const levelingSystem = new LevelingSystem();    // 🚧 TO BUILD
const analyticsSystem = new AnalyticsSystem();  // 🚧 TO BUILD
const agentPoolSystem = new AgentPoolSystem();  // ✅ PARTIALLY DONE

// Load commands
ChopsticksBot.commands = new Collection();
loadCommands([
  'music',      // ✅ DONE
  'moderation', // 🚧 TO BUILD
  'economy',    // 🚧 TO BUILD
  'leveling',   // 🚧 TO BUILD
  'agents',     // ✅ PARTIALLY DONE
  'utility',    // 🚧 TO BUILD
  'config'      // 🚧 TO BUILD
]);

ChopsticksBot.login(process.env.CHOPSTICKS_BOT_TOKEN);
```

### Agent Runner Processes (Separate):
```javascript
// src/agents/agentRunner.js - Runs pool agents

const agent = new Discord.Client({ /* minimal intents */ });

// Load configuration from database
const agentConfig = await loadAgentConfig(agentId);

// Load only enabled tools
const tools = loadTools(agentConfig.enabled_tools);

// Set behavior mode
const handler = createHandler(agentConfig.mode);

agent.on('messageCreate', async (message) => {
  await handler.handleMessage(message);
});

agent.login(agentConfig.decrypted_token);
```

---

## 💡 THE KEY CONSTRAINT & SCALE STRATEGY

**Discord Limit: 50 bots per server maximum**
- Chopsticks = 1 bot (always present)
- Maximum agents deployable per server = 49

**Global Pool Strategy:**
- 50,000 bot tokens in global pool
- Dynamically assigned to servers on-demand
- Agents can be reassigned between servers
- Most servers only need 1-5 agents
- Pool can serve 10,000-50,000 servers concurrently

**Scaling to 1 Million Servers:**

If we have 1,000,000 servers:
- Average 1 agent per server = Need 1,000,000 agents (not feasible)
- Average 2 agents per server = Need 2,000,000 agents (not feasible)

**SOLUTION: Agent Reuse & Time-Sharing**
```
Peak Hours:
- 20% of servers active (200,000 servers)
- Average 2 agents per active server
- Total agents needed: 400,000

Off-Peak Hours:  
- 5% of servers active (50,000 servers)
- Average 2 agents per active server
- Total agents needed: 100,000

Strategy:
1. Start with 50,000 agents in pool
2. Monitor usage patterns
3. Scale pool size based on demand
4. Add more agents as user base grows
5. Optimize assignment algorithm
6. Release idle agents back to pool
```

**Priority System:**
```
When pool is near capacity:
1. Music agents (CRITICAL - can't work without)
2. Mod agents (HIGH - security/safety)
3. AI companions (MEDIUM - nice to have)
4. Multiple music bots (LOW - luxury)

If server requests agent but pool is full:
- Queue the request
- Allocate agent when one becomes available
- Premium servers get priority (future tier)
```

**Current Status:**
- Everything FREE right now
- No tiers yet (implement later)
- Focus: Make 1 agent per server work flawlessly for 1M servers
- Then: Optimize for multiple agents per server

---

## 🚀 DEVELOPMENT PRIORITY

### Phase 1: Chopsticks Core (Weeks 2-8)
**Goal:** Make Chopsticks a complete, powerful standalone bot

1. **Week 2-3: Moderation System**
   - Ban, kick, timeout, warn
   - Auto-moderation
   - Logging
   
2. **Week 4-5: Economy & Games**
   - Currency system
   - Casino games
   - Shop & inventory
   
3. **Week 6-7: Leveling System**
   - XP system
   - Role rewards
   - Rank cards (Canvas)
   
4. **Week 8: Polish & Testing**
   - Bug fixes
   - Performance optimization
   - Documentation

### Phase 2: Agent Configuration UI (Weeks 9-12)
**Goal:** Build the visual interface for configuring agents

1. **Week 9-10: Web Dashboard**
   - Agent list view
   - Configuration wizard
   - Tool selection UI
   
2. **Week 11-12: Advanced Config**
   - Personality builder
   - Behavior rules
   - Template system

### Phase 3: Agent Intelligence (Weeks 13-16)
**Goal:** Enable AI-powered agents

1. **Week 13-14: AI Integration**
   - GPT-4 integration
   - Decision engine
   - Memory system
   
2. **Week 15-16: Voice AI**
   - ElevenLabs integration
   - Voice synthesis
   - Voice personalities

### Phase 4: Marketplace (Weeks 17-20)
**Goal:** Template marketplace & monetization

1. **Week 17-18: Template System**
   - Save/load templates
   - Template marketplace
   - Featured templates
   
2. **Week 19-20: Monetization**
   - Subscription tiers
   - Billing integration
   - Usage tracking

---

## ✅ CURRENT STATUS

**Chopsticks Bot:**
- ✅ Music System (operational, needs polish)
- ✅ Agent Pool Core (token management, deployment)
- ❌ Moderation System (not built)
- ❌ Economy & Games (not built)
- ❌ Leveling System (not built)
- ❌ Web Dashboard (basic exists, needs expansion)
- ❌ Agent Configuration UI (not built)

**Next Steps:**
1. Finish hardening music system
2. Build moderation system (highest priority after music)
3. Build economy system
4. Build leveling system
5. Build agent configuration UI

---

**THIS is what Chopsticks needs to be: A complete, powerful, feature-rich bot that ALSO manages an agent pool system.**
