# Agent Protocol Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-02-14

## Overview

The Chopsticks platform uses a WebSocket-based protocol for communication between the controller (main bot) and agents (music/assistant bots). This document defines the protocol contract.

## Protocol Versioning

**Current Version:** `1.0.0`

### Version Negotiation

1. Agent sends `hello` message with `protocolVersion` field
2. Controller validates version against `SUPPORTED_VERSIONS`
3. If incompatible, controller rejects connection with error message
4. If compatible, connection is established

###Supported Versions

- `1.0.0` - Initial versioned protocol

### Version Compatibility Matrix

| Controller Version | Supported Agent Versions |
|-------------------|--------------------------|
| 1.0.0             | 1.0.0                    |

## Message Types

All messages are JSON objects sent over WebSocket. Messages flow in two directions:

- **Agent → Controller**: `hello`, `guilds`, `event`, `resp`
- **Controller → Agent**: `req`, `error`

---

## Agent → Controller Messages

### 1. `hello` Message

**Purpose:** Initial handshake and periodic heartbeat (~30s)

**Fields:**
```typescript
{
  type: "hello",
  protocolVersion: string,        // REQUIRED: Protocol version (e.g., "1.0.0")
  agentId: string,                // REQUIRED: Unique agent identifier
  botUserId: string | null,       // Discord bot user ID
  tag: string | null,             // Discord bot tag/name
  ready: boolean,                 // Lavalink ready status
  guildIds: string[],             // Array of guild IDs agent is in
  poolId: string,                 // Agent pool identifier
  runnerSecret?: string           // Optional runner authentication secret
}
```

**Example:**
```json
{
  "type": "hello",
  "protocolVersion": "1.0.0",
  "agentId": "agent1468195142467981395",
  "botUserId": "1468195142467981395",
  "tag": "MusicBot#1234",
  "ready": true,
  "guildIds": ["1445809891242414226"],
  "poolId": "pool_goot27"
}
```

**Controller Response:**
- Success: Registers agent in `liveAgents` map
- Failure: Sends `error` message and closes connection

**Error Conditions:**
- Missing `protocolVersion`: Closed with code 1008
- Incompatible `protocolVersion`: Closed with code 1008
- Missing `agentId`: Ignored (no response)

---

### 2. `guilds` Message

**Purpose:** Update guild membership (~30s heartbeat)

**Fields:**
```typescript
{
  type: "guilds",
  guildIds: string[]              // Updated list of guild IDs
}
```

**Example:**
```json
{
  "type": "guilds",
  "guildIds": ["1445809891242414226", "987654321098765432"]
}
```

**Behavior:**
- Updates agent's `guildIds` set
- Logs guild additions/removals for debugging
- No response sent

---

### 3. `event` Message

**Purpose:** Report voice channel lifecycle events

#### Event Type: `released`

Sent when disconnecting from voice channel

**Fields:**
```typescript
{
  type: "event",
  event: "released",
  agentId: string,                // Agent identifier
  guildId: string,                // Guild ID
  voiceChannelId: string,         // Voice channel ID
  reason: string,                 // Why it released (e.g., "USER_LEFT", "TIMEOUT")
  kind: "music" | "assistant"     // Session type
}
```

**Example:**
```json
{
  "type": "event",
  "event": "released",
  "agentId": "agent1468195142467981395",
  "guildId": "1445809891242414226",
  "voiceChannelId": "1445809891242414229",
  "reason": "USER_LEFT",
  "kind": "music"
}
```

**Behavior:**
- Controller marks agent as available
- Removes session from `sessions` or `assistantSessions` map

#### Event Type: `add`

Sent when joining voice channel

**Fields:**
```typescript
{
  type: "event",
  event: "add",
  agentId: string,                // Agent identifier
  guildId: string,                // Guild ID
  voiceChannelId: string,         // Voice channel ID
  textChannelId?: string,         // Optional text channel ID
  channelId: string,              // Same as voiceChannelId (redundant)
  kind: "music" | "assistant",    // Session type
  ownerUserId?: string,           // Optional session owner
  ok: boolean,                    // Success flag
  error?: string                  // Error message if !ok
}
```

**Example Success:**
```json
{
  "type": "event",
  "event": "add",
  "agentId": "agent1468195142467981395",
  "guildId": "1445809891242414226",
  "voiceChannelId": "1445809891242414229",
  "channelId": "1445809891242414229",
  "kind": "music",
  "ownerUserId": "1457586883742928907",
  "ok": true
}
```

**Example Failure:**
```json
{
  "type": "event",
  "event": "add",
  "agentId": "agent1468195142467981395",
  "guildId": "1445809891242414226",
  "voiceChannelId": "1445809891242414229",
  "channelId": "1445809891242414229",
  "kind": "music",
  "ok": false,
  "error": "Missing permissions: CONNECT, SPEAK"
}
```

---

### 4. `resp` Message

**Purpose:** Response to RPC request from controller

**Fields:**
```typescript
{
  type: "resp",
  id: string,                     // REQUIRED: Matches request ID (UUID)
  ok: boolean,                    // REQUIRED: Success flag
  data?: any,                     // Result data if ok=true
  error?: string                  // Error message if ok=false
}
```

**Example Success:**
```json
{
  "type": "resp",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ok": true,
  "data": {
    "track": {
      "title": "Never Gonna Give You Up",
      "author": "Rick Astley",
      "duration": 213000
    },
    "action": "playing"
  }
}
```

**Example Failure:**
```json
{
  "type": "resp",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "ok": false,
  "error": "Track not found"
}
```

---

## Controller → Agent Messages

### 1. `req` Message

**Purpose:** RPC-style command from controller to agent

**Fields:**
```typescript
{
  type: "req",
  id: string,                     // REQUIRED: UUID for matching response
  op: string,                     // REQUIRED: Operation name
  data: any,                      // Operation-specific payload
  agentId: string                 // Target agent identifier
}
```

**Example:**
```json
{
  "type": "req",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "op": "play",
  "data": {
    "guildId": "1445809891242414226",
    "voiceChannelId": "1445809891242414229",
    "query": "never gonna give you up"
  },
  "agentId": "agent1468195142467981395"
}
```

**Common Operations:**
- `play` - Play a track
- `pause` - Pause playback
- `resume` - Resume playback
- `skip` - Skip current track
- `stop` - Stop playback
- `queue` - Get queue info
- `search` - Search for tracks
- `status` - Get player status

**Response Required:**
- Agent must respond with `resp` message matching `id`
- Timeout: 30 seconds (default)

---

### 2. `error` Message

**Purpose:** Notify agent of protocol errors

**Fields:**
```typescript
{
  type: "error",
  error: string                   // Human-readable error message
}
```

**Example:**
```json
{
  "type": "error",
  "error": "Incompatible protocol version 0.9.0. Controller expects 1.0.0."
}
```

**Behavior:**
- Connection may be closed after error
- Agent should log error and attempt reconnection

---

## Connection Lifecycle

### 1. Initial Connection

```
Agent                           Controller
  |                                |
  |---------- connect ------------>|
  |                                |
  |<--------- accepted ------------|
  |                                |
  |------- hello (v1.0.0) -------->|
  |                                |
  |                         [validates version]
  |                                |
  |<----- agent registered --------|
  |                                |
```

### 2. Version Mismatch

```
Agent                           Controller
  |                                |
  |---------- connect ------------>|
  |                                |
  |------- hello (v0.9.0) -------->|
  |                                |
  |                         [rejects version]
  |                                |
  |<-------- error message --------|
  |                                |
  |<----- connection closed -------|
  |                                |
```

### 3. Heartbeat

```
Agent                           Controller
  |                                |
  |------- hello (periodic) ------>|
  |                                |
  |         [updates lastSeen]     |
  |                                |
  |------ guilds (periodic) ------>|
  |                                |
  |    [updates guild membership]  |
  |                                |
```

### 4. RPC Flow

```
Agent                           Controller
  |                                |
  |<------- req (play) ------------|
  |                                |
  |     [processes request]        |
  |                                |
  |------- resp (success) -------->|
  |                                |
```

### 5. Graceful Disconnect

```
Agent                           Controller
  |                                |
  |---- event (released) --------->|
  |                                |
  |         [marks available]      |
  |                                |
  |---------- close --------------->|
  |                                |
  |     [removes from liveAgents]  |
  |                                |
```

---

## Error Handling

### Protocol Errors

| Error | Code | Action |
|-------|------|--------|
| Missing version | 1008 | Connection closed |
| Incompatible version | 1008 | Connection closed |
| Invalid message format | N/A | Message ignored |
| Missing required field | N/A | Message ignored |

### Operation Errors

Operation-specific errors returned in `resp` message with `ok: false`.

---

## Version History

### 1.0.0 (2026-02-14)

**Initial versioned protocol**

**Added:**
- `protocolVersion` field to `hello` message
- Version negotiation in handshake
- `SUPPORTED_VERSIONS` compatibility check
- Protocol documentation

**Breaking Changes:**
- Agents without `protocolVersion` will be rejected

---

## Implementation Notes

### Controller (agentManager.js)

- Protocol version: `PROTOCOL_VERSION = "1.0.0"`
- Supported versions: `SUPPORTED_VERSIONS = new Set(["1.0.0"])`
- Version stored in agent object: `agent.protocolVersion`

### Agent (agentRunner.js)

- Protocol version: `PROTOCOL_VERSION = "1.0.0"`
- Sent in every `hello` message
- No version checking on agent side (controller enforces)

### Adding New Versions

1. Update `PROTOCOL_VERSION` in both files
2. Add new version to `SUPPORTED_VERSIONS` in controller
3. Update compatibility matrix in this document
4. Document breaking changes
5. Test backward compatibility if supporting multiple versions

---

## Testing

### Version Compatibility Test

```bash
# Start controller (v1.0.0)
# Start agent (v1.0.0) - should connect
# Start agent (v0.9.0) - should reject
# Check logs for version validation messages
```

### Message Format Test

```bash
# Verify all messages include required fields
# Verify protocolVersion in hello message
# Verify error messages sent on version mismatch
```

---

## Future Considerations

### Version 2.0.0 (Planned)

**Potential Changes:**
- Add message-level versioning (not just connection-level)
- Add capability negotiation (feature flags)
- Add compression support for large payloads
- Add authentication/encryption

---

## References

- `src/agents/agentManager.js` - Controller implementation
- `src/agents/agentRunner.js` - Agent implementation
- `status/MATURITY.md` - Platform maturity model (Level 1)
