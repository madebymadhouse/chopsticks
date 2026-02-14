import client from "prom-client";
import { botLogger } from "./modernLogger.js";

// Initialize Prometheus metrics registry
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register, prefix: "chopsticks_" });

// Custom metrics for Chopsticks bot

// === Bot Metrics ===
export const commandCounter = new client.Counter({
  name: "chopsticks_commands_total",
  help: "Total number of commands executed",
  labelNames: ["command", "status"], // status: success | error | rate_limited
  registers: [register],
});

export const commandDuration = new client.Histogram({
  name: "chopsticks_command_duration_seconds",
  help: "Command execution duration in seconds",
  labelNames: ["command"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// === Economy Metrics ===
export const creditsTransferred = new client.Counter({
  name: "chopsticks_economy_credits_transferred_total",
  help: "Total credits transferred between users",
  registers: [register],
});

export const transactionCounter = new client.Counter({
  name: "chopsticks_economy_transactions_total",
  help: "Total economy transactions",
  labelNames: ["type"], // type: daily | work | pay | gather | purchase
  registers: [register],
});

export const userWalletGauge = new client.Gauge({
  name: "chopsticks_economy_user_wallets_total",
  help: "Total number of user wallets created",
  registers: [register],
});

// === Music Metrics ===
export const musicPlayCounter = new client.Counter({
  name: "chopsticks_music_tracks_played_total",
  help: "Total music tracks played",
  registers: [register],
});

export const activeVoiceConnections = new client.Gauge({
  name: "chopsticks_music_voice_connections_active",
  help: "Number of active voice connections",
  registers: [register],
});

export const queueSize = new client.Histogram({
  name: "chopsticks_music_queue_size",
  help: "Size of music queue",
  buckets: [1, 5, 10, 20, 50, 100],
  registers: [register],
});

// === Agent Pool Metrics ===
export const agentPoolSize = new client.Gauge({
  name: "chopsticks_agent_pool_size_total",
  help: "Total number of agents in pool",
  registers: [register],
});

export const agentPoolActive = new client.Gauge({
  name: "chopsticks_agent_pool_active",
  help: "Number of active agents currently deployed",
  registers: [register],
});

export const agentDeployCounter = new client.Counter({
  name: "chopsticks_agent_deployments_total",
  help: "Total agent deployments",
  labelNames: ["success"], // success: true | false
  registers: [register],
});

// === Level 2: Agent Lifecycle Metrics ===
export const agentRegistrations = new client.Counter({
  name: "chopsticks_agent_registrations_total",
  help: "Total agent registration attempts",
  labelNames: ["status"], // status: success | failure | rejected
  registers: [register],
});

export const agentRestarts = new client.Counter({
  name: "chopsticks_agent_restarts_total",
  help: "Total agent reconnections/restarts",
  registers: [register],
});

export const agentDisconnects = new client.Counter({
  name: "chopsticks_agent_disconnects_total",
  help: "Total agent disconnections",
  labelNames: ["reason"], // reason: timeout | error | manual | unknown
  registers: [register],
});

export const agentConnectedGauge = new client.Gauge({
  name: "chopsticks_agent_connected",
  help: "Number of currently connected agents",
  registers: [register],
});

export const agentReadyGauge = new client.Gauge({
  name: "chopsticks_agent_ready",
  help: "Number of agents in ready state",
  registers: [register],
});

export const agentBusyGauge = new client.Gauge({
  name: "chopsticks_agent_busy",
  help: "Number of agents currently busy",
  labelNames: ["kind"], // kind: music | assistant
  registers: [register],
});

export const sessionsActiveGauge = new client.Gauge({
  name: "chopsticks_sessions_active",
  help: "Number of active sessions (music + assistant)",
  labelNames: ["kind"], // kind: music | assistant
  registers: [register],
});

export const sessionAllocations = new client.Counter({
  name: "chopsticks_session_allocations_total",
  help: "Total session allocation attempts",
  labelNames: ["kind", "status"], // kind: music | assistant, status: success | no_agents | no_free_agents
  registers: [register],
});

export const sessionReleases = new client.Counter({
  name: "chopsticks_session_releases_total",
  help: "Total session releases",
  labelNames: ["kind"], // kind: music | assistant
  registers: [register],
});

export const voiceAttachments = new client.Counter({
  name: "chopsticks_voice_attachments_total",
  help: "Total voice channel attachment attempts",
  labelNames: ["status"], // status: success | failure
  registers: [register],
});

export const sessionAllocationDuration = new client.Histogram({
  name: "chopsticks_session_allocation_duration_seconds",
  help: "Time taken to allocate a session",
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});


// === Security Metrics ===
export const rateLimitHits = new client.Counter({
  name: "chopsticks_rate_limit_hits_total",
  help: "Number of rate limit violations",
  labelNames: ["type"], // type: command | api | sensitive
  registers: [register],
});

export const authAttempts = new client.Counter({
  name: "chopsticks_auth_attempts_total",
  help: "Authentication attempts",
  labelNames: ["status"], // status: success | failure
  registers: [register],
});

// === Database Metrics ===
export const dbQueryDuration = new client.Histogram({
  name: "chopsticks_db_query_duration_seconds",
  help: "Database query execution time",
  labelNames: ["operation"], // operation: select | insert | update | delete
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export const dbConnectionPoolGauge = new client.Gauge({
  name: "chopsticks_db_connection_pool_size",
  help: "Database connection pool size",
  registers: [register],
});

// === Discord API Metrics ===
export const discordApiCalls = new client.Counter({
  name: "chopsticks_discord_api_calls_total",
  help: "Total Discord API calls made",
  labelNames: ["endpoint", "status"],
  registers: [register],
});

export const discordRateLimits = new client.Counter({
  name: "chopsticks_discord_rate_limits_total",
  help: "Number of Discord rate limits hit",
  labelNames: ["endpoint"],
  registers: [register],
});

// === Helper functions ===

// Track command execution
export function trackCommand(commandName, duration, status = "success") {
  commandCounter.inc({ command: commandName, status });
  commandDuration.observe({ command: commandName }, duration / 1000);
}

// Track economy transaction
export function trackTransaction(type, amount) {
  transactionCounter.inc({ type });
  if (amount) {
    creditsTransferred.inc(amount);
  }
}

// Track rate limit hit
export function trackRateLimit(type) {
  rateLimitHits.inc({ type });
}

// Track database query
export function trackDbQuery(operation, duration) {
  dbQueryDuration.observe({ operation }, duration / 1000);
}

// === Level 2: Agent Lifecycle Tracking ===

export function trackAgentRegistration(status = 'success') {
  agentRegistrations.inc({ status });
}

export function trackAgentRestart() {
  agentRestarts.inc();
}

export function trackAgentDisconnect(reason = 'unknown') {
  agentDisconnects.inc({ reason });
}

export function updateAgentGauges(connected = 0, ready = 0, busy = { music: 0, assistant: 0 }) {
  agentConnectedGauge.set(connected);
  agentReadyGauge.set(ready);
  agentBusyGauge.set({ kind: 'music' }, busy.music || 0);
  agentBusyGauge.set({ kind: 'assistant' }, busy.assistant || 0);
}

export function trackSessionAllocation(kind, status, durationMs = null) {
  sessionAllocations.inc({ kind, status });
  if (durationMs !== null) {
    sessionAllocationDuration.observe(durationMs / 1000);
  }
}

export function trackSessionRelease(kind) {
  sessionReleases.inc({ kind });
}

export function updateSessionGauges(active = { music: 0, assistant: 0 }) {
  sessionsActiveGauge.set({ kind: 'music' }, active.music || 0);
  sessionsActiveGauge.set({ kind: 'assistant' }, active.assistant || 0);
}

export function trackVoiceAttachment(success = true) {
  voiceAttachments.inc({ status: success ? 'success' : 'failure' });
}


// Metrics endpoint for Prometheus scraping
export async function metricsHandler(req, res) {
  try {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    botLogger.error({ err }, "Failed to generate metrics");
    res.status(500).end();
  }
}

// Health check endpoint
export function healthHandler(req, res) {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || "unknown",
  });
}

export { register };
export default register;
