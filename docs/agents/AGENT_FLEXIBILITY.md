# Agent Configuration Modes - Full Flexibility

## 🎯 THE KEY PRINCIPLE

**Agents start EMPTY. Users enable exactly what they want. Nothing more.**

No forced AI. No forced personality. No forced features.  
Want just music? Done.  
Want full AI personality? Done.  
Want something in between? Done.

---

## 📋 CONFIGURATION WIZARD

### Step 1: Choose Agent Mode

```
┌─────────────────────────────────────────────────────────────────┐
│  What do you want this agent to do?                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚪ Bare-Bones Bot                                              │
│     Just commands. No AI. No personality.                       │
│     Examples: Music bot, mod bot, utility bot                   │
│     Cost: FREE                                                  │
│                                                                  │
│  ⚪ Enhanced Bot                                                │
│     Commands + automation rules. No AI.                         │
│     Examples: Auto-mod, scheduled messages, reaction roles      │
│     Cost: FREE                                                  │
│                                                                  │
│  ⚪ Smart Bot                                                   │
│     Commands + AI for questions. Limited personality.           │
│     Examples: FAQ bot, helper bot, smart utility bot            │
│     Cost: $5/month                                              │
│                                                                  │
│  ⚪ Character Bot                                               │
│     Full AI personality. Autonomous behavior.                   │
│     Examples: AI companion, event host, community member        │
│     Cost: $15/month                                             │
│                                                                  │
│  ⚪ Custom Configuration                                        │
│     Pick exactly what you want enabled.                         │
│     Cost: Varies                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 2: Select Tools (If Custom Mode)

```
┌─────────────────────────────────────────────────────────────────┐
│  Which tools should this agent have?                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ☑ Music (play, queue, controls)                               │
│  ☐ Moderation (ban, kick, timeout, automod)                    │
│  ☐ Games & Economy (coins, casino, inventory)                  │
│  ☐ Leveling & XP (ranks, leaderboards)                         │
│  ☐ Utility (polls, reminders, logging)                         │
│  ☐ Voice/TTS (speak, soundboard)                               │
│  ☐ Analytics (stats, graphics)                                 │
│  ☐ API/Webhooks (external integrations)                        │
│                                                                  │
│  [Select All]  [Deselect All]  [Presets ▼]                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 3: Behavior Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│  How should this agent behave?                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Response Mode:                                                 │
│  ⚪ Command-only (only responds to /commands)                  │
│  ⚪ Mentioned (responds when @mentioned)                        │
│  ⚪ Active (participates in conversations) [requires AI]        │
│                                                                  │
│  Autonomous Actions:                                            │
│  ☐ Send proactive messages [requires AI]                       │
│  ☐ React to messages with emojis                               │
│  ☐ Join voice channels automatically                           │
│  ☐ Run scheduled tasks (announcements, etc.)                   │
│                                                                  │
│  AI Configuration:                                              │
│  ⚪ AI Disabled                                                 │
│  ⚪ AI for Q&A only (responds when asked)                      │
│  ⚪ AI with personality (full character)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 4: AI & Personality (If Enabled)

```
┌─────────────────────────────────────────────────────────────────┐
│  Configure AI & Personality (Optional)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Personality Template:                                          │
│  ⚪ None (just answer questions plainly)                       │
│  ⚪ Friendly Assistant                                          │
│  ⚪ Casual Friend                                               │
│  ⚪ Professional Helper                                         │
│  ⚪ Custom Character (build your own)                          │
│                                                                  │
│  If Custom Character:                                           │
│  Name: [________________]                                       │
│  Gender: [_____________]                                        │
│  Age: [___]                                                     │
│  Personality Traits: [_________________________]               │
│  Interests: [____________________________________]              │
│  Speech Style: [_________________________________]              │
│                                                                  │
│  Voice Model (optional):                                        │
│  ⚪ Text only (no voice)                                       │
│  ⚪ Default TTS voice (free)                                   │
│  ⚪ Premium voice from marketplace ($)                         │
│  ⚪ Custom trained voice ($$)                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 5: Channel Restrictions

```
┌─────────────────────────────────────────────────────────────────┐
│  Where can this agent operate?                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Text Channels:                                                 │
│  ☑ #general                                                     │
│  ☑ #music                                                       │
│  ☐ #memes                                                       │
│  ☐ #support                                                     │
│  [+ Add Channel]                                                │
│                                                                  │
│  Voice Channels:                                                │
│  ☑ Music Room                                                   │
│  ☐ General Voice                                                │
│  [+ Add Channel]                                                │
│                                                                  │
│  DMs:                                                           │
│  ☐ Allow users to DM this agent                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Step 6: Deploy

```
┌─────────────────────────────────────────────────────────────────┐
│  Ready to Deploy                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Agent Configuration Summary:                                   │
│  ├─ Mode: Bare-Bones Bot                                       │
│  ├─ Tools: Music                                               │
│  ├─ Behavior: Command-only                                     │
│  ├─ AI: Disabled                                               │
│  ├─ Channels: #music, Music Room                              │
│  └─ Cost: FREE                                                 │
│                                                                  │
│  This agent will:                                               │
│  • Respond to /play, /queue, /skip commands                   │
│  • Play music in voice channels                                │
│  • Send simple text responses                                  │
│                                                                  │
│  This agent will NOT:                                           │
│  • Use AI or have personality                                  │
│  • Send messages on its own                                    │
│  • Respond to non-command messages                             │
│                                                                  │
│  [← Back]  [Save as Draft]  [Deploy Agent →]                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PRESET CONFIGURATIONS

### 1. "Just Music" Bot
```json
{
  "mode": "bare-bones",
  "enabled_tools": ["music"],
  "behavior": {
    "response_mode": "command_only",
    "autonomous_actions": false,
    "ai_enabled": false
  },
  "commands": ["/play", "/queue", "/skip", "/stop", "/pause", "/resume"],
  "cost": "free"
}
```

### 2. "Just Moderation" Bot
```json
{
  "mode": "bare-bones",
  "enabled_tools": ["moderation", "utility:logging"],
  "behavior": {
    "response_mode": "command_only",
    "autonomous_actions": false,
    "ai_enabled": false
  },
  "commands": ["/ban", "/kick", "/timeout", "/warn", "/purge"],
  "cost": "free"
}
```

### 3. "Music + Auto-DJ" Bot
```json
{
  "mode": "enhanced",
  "enabled_tools": ["music", "utility"],
  "behavior": {
    "response_mode": "command_only",
    "autonomous_actions": true,
    "auto_actions": [
      "announce_now_playing",
      "auto_queue_radio_when_empty"
    ],
    "ai_enabled": false
  },
  "cost": "free"
}
```

### 4. "Helpful Music Bot" (Light AI)
```json
{
  "mode": "smart",
  "enabled_tools": ["music", "utility"],
  "behavior": {
    "response_mode": "mentioned",
    "autonomous_actions": false,
    "ai_enabled": true,
    "ai_mode": "qa_only"
  },
  "ai_config": {
    "model": "gpt-3.5-turbo",
    "system_prompt": "You are a helpful music bot. Answer questions about music.",
    "max_calls_per_day": 100
  },
  "cost": "$5/month"
}
```

### 5. "Luna - AI Companion" (Full Character)
```json
{
  "mode": "character",
  "enabled_tools": ["music", "games", "voice", "utility", "leveling"],
  "behavior": {
    "response_mode": "active",
    "autonomous_actions": true,
    "ai_enabled": true,
    "ai_mode": "full_personality"
  },
  "character": {
    "name": "Luna",
    "personality": { /* full profile */ },
    "voice_model": "elevenlabs:custom"
  },
  "cost": "$15/month"
}
```

---

## 🔧 TECHNICAL: MODE HANDLERS

### Bare-Bones Mode Handler
```javascript
class BareBonesBotHandler {
  constructor(agent, config) {
    this.agent = agent;
    this.config = config;
    this.commandHandler = new CommandHandler(config.enabled_tools);
  }
  
  async handleMessage(message) {
    // ONLY process if it's a command
    if (!message.content.startsWith('/')) {
      return; // Ignore non-commands
    }
    
    // Parse and execute command
    const command = this.parseCommand(message.content);
    if (!this.commandHandler.isEnabled(command.name)) {
      return; // Command not enabled for this agent
    }
    
    const result = await this.commandHandler.execute(command, message);
    
    // Simple response, no AI
    await message.reply(result.response);
  }
  
  async handleInteraction(interaction) {
    // Handle slash commands
    const tool = this.config.enabled_tools.find(t => 
      t.hasCommand(interaction.commandName)
    );
    
    if (!tool) {
      await interaction.reply({ content: 'Command not enabled', ephemeral: true });
      return;
    }
    
    await tool.execute(interaction);
  }
}
```

### Enhanced Mode Handler
```javascript
class EnhancedBotHandler {
  constructor(agent, config) {
    this.agent = agent;
    this.config = config;
    this.commandHandler = new CommandHandler(config.enabled_tools);
    this.automationEngine = new AutomationEngine(config.auto_actions);
  }
  
  async handleMessage(message) {
    // Process commands
    if (message.content.startsWith('/')) {
      await this.commandHandler.execute(message);
      return;
    }
    
    // Check automation rules (NO AI)
    const triggers = this.automationEngine.checkTriggers(message);
    for (const trigger of triggers) {
      await trigger.execute(message);
    }
  }
  
  async runScheduledTasks() {
    // Execute scheduled actions (announcements, etc.)
    const tasks = await this.automationEngine.getScheduledTasks();
    for (const task of tasks) {
      await task.execute();
    }
  }
}
```

### Smart Mode Handler
```javascript
class SmartBotHandler {
  constructor(agent, config) {
    this.agent = agent;
    this.config = config;
    this.commandHandler = new CommandHandler(config.enabled_tools);
    this.aiEngine = new AIEngine(config.ai_config);
  }
  
  async handleMessage(message) {
    // Process commands
    if (message.content.startsWith('/')) {
      await this.commandHandler.execute(message);
      return;
    }
    
    // Only use AI if mentioned or asked a question
    const isMentioned = message.mentions.has(this.agent.id);
    const isQuestion = message.content.endsWith('?');
    
    if (isMentioned || isQuestion) {
      // Check daily AI limit
      if (await this.hasReachedAILimit()) {
        await message.reply("I've reached my daily AI limit. Try again tomorrow!");
        return;
      }
      
      // Use AI to respond
      const response = await this.aiEngine.generateResponse({
        message: message.content,
        context: await this.getBasicContext(message),
        mode: 'qa_only' // Limited mode
      });
      
      await message.reply(response);
      await this.incrementAIUsage();
    }
  }
  
  async hasReachedAILimit() {
    const usage = await this.getAIUsageToday();
    return usage >= this.config.ai_config.max_calls_per_day;
  }
}
```

### Character Mode Handler
```javascript
class CharacterBotHandler {
  constructor(agent, config) {
    this.agent = agent;
    this.config = config;
    this.commandHandler = new CommandHandler(config.enabled_tools);
    this.aiEngine = new AdvancedAIEngine(config.character, config.ai_config);
    this.memorySystem = new MemorySystem(agent.id);
    this.decisionEngine = new DecisionEngine(config.character.personality);
  }
  
  async handleMessage(message) {
    // Process commands (still available)
    if (message.content.startsWith('/')) {
      await this.commandHandler.execute(message);
      return;
    }
    
    // Store message in memory
    await this.memorySystem.store(message);
    
    // Decide whether to respond (based on personality)
    const decision = await this.decisionEngine.shouldRespond(message, {
      recentMessages: await this.memorySystem.getRecentMessages(50),
      relationship: await this.memorySystem.getRelationship(message.author.id)
    });
    
    if (!decision.respond) {
      return; // Agent chooses not to respond
    }
    
    // Generate AI response with full personality
    const response = await this.aiEngine.generateResponse({
      message: message.content,
      context: await this.memorySystem.getFullContext(message),
      character: this.config.character,
      mood: await this.getMood()
    });
    
    // Send response
    await message.reply(response);
    
    // Update relationship
    await this.memorySystem.updateRelationship(message.author.id, 'positive');
  }
  
  async runAutonomousBehaviors() {
    // Proactive actions (random thoughts, scheduled events, etc.)
    const actions = await this.decisionEngine.getProactiveActions();
    for (const action of actions) {
      await action.execute();
    }
  }
}
```

---

## 💰 COST BREAKDOWN BY MODE

### Free Tier:
- **Bare-Bones Bots:** Unlimited
- **Enhanced Bots:** Unlimited
- **Smart Bots:** 0 (requires paid tier)
- **Character Bots:** 0 (requires paid tier)
- **Total Agents:** 5

### Pro Tier ($15/month):
- **Bare-Bones Bots:** Unlimited
- **Enhanced Bots:** Unlimited
- **Smart Bots:** Up to 10 (100 AI calls/day each)
- **Character Bots:** Up to 5 (500 AI calls/day each)
- **Total Agents:** 25

### Business Tier ($75/month):
- **All Bots:** Unlimited configurations
- **Smart Bots:** Unlimited (1000 AI calls/day each)
- **Character Bots:** Unlimited (5000 AI calls/day each)
- **Custom Voice Models:** Included
- **Total Agents:** 100

---

## ✅ KEY TAKEAWAY

**Agents are NOT forced to be AI-powered.**  
**Agents are NOT forced to have personality.**  
**Agents can be as simple or complex as users want.**

- Want just music? Done. No AI needed.
- Want just moderation? Done. No personality needed.
- Want full AI character? Done. We support that too.

**Users decide. We provide the platform.**
