import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { Registry, collectDefaultMetrics, Counter, Gauge, Histogram } from "prom-client";
import { createDebugHandler, createDebugDashboard } from "./debugDashboard.js";
import { register as appMetricsRegister } from "./metrics.js";

let server = null;
let registry = null;
let commandCounter = null;
let commandErrorCounter = null;
let commandLatency = null;
let agentGauge = null;
let agentManager = null; // For debug dashboard

const commandStats = new Map(); // command -> { ok, err, totalMs, count }
const commandStatsByGuild = new Map(); // guildId -> Map(command -> stats)
const commandDelta = new Map(); // command -> { ok, err, totalMs, count }
const commandDeltaByGuild = new Map(); // guildId -> Map(command -> stats)

function safeEq(a, b) {
  const aa = String(a ?? "");
  const bb = String(b ?? "");
  if (Buffer.byteLength(aa) !== Buffer.byteLength(bb)) return false;
  try {
    return timingSafeEqual(Buffer.from(aa), Buffer.from(bb));
  } catch {
    return false;
  }
}

export function readHealthSecurityConfig(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || "").toLowerCase();
  const debugEnabledRaw = String(env.HEALTH_DEBUG_ENABLED ?? (nodeEnv === "production" ? "false" : "true")).toLowerCase();
  const debugEnabled = debugEnabledRaw === "true" || debugEnabledRaw === "1" || debugEnabledRaw === "yes";
  const debugToken = String(env.HEALTH_DEBUG_TOKEN || "").trim();
  const metricsToken = String(env.HEALTH_METRICS_TOKEN || "").trim();
  return { debugEnabled, debugToken, metricsToken };
}

export function isHealthAuthorized(req, token) {
  const t = String(token || "").trim();
  if (!t) return true;

  const header = String(req?.headers?.authorization || "");
  const m = header.match(/^Bearer\s+(.+)\s*$/i);
  const presented = m ? m[1] : "";
  if (safeEq(presented, t)) return true;

  const alt = String(req?.headers?.["x-metrics-token"] || req?.headers?.["x-health-token"] || "");
  return safeEq(alt, t);
}

export function startHealthServer(manager = null) {
  // Store agent manager reference for debug dashboard
  const sec = readHealthSecurityConfig(process.env);
  if (manager) agentManager = manager;
  if (manager && sec.debugEnabled) console.log("✅ Debug dashboard enabled at /debug/dashboard");
  
  if (server) return server;

  const port = Number(process.env.HEALTH_PORT || process.env.METRICS_PORT || 9100);
  if (!Number.isFinite(port) || port < 0) return null;
  const allowFallback =
    String(process.env.METRICS_PORT_FALLBACK ?? "true").toLowerCase() !== "false";
  const maxBump = Math.max(0, Math.trunc(Number(process.env.METRICS_PORT_BUMP || 10)));

  registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: "chopsticks_" });

  commandCounter = new Counter({
    name: "chopsticks_commands_total",
    help: "Total commands executed",
    labelNames: ["command"]
  });
  registry.registerMetric(commandCounter);

  commandErrorCounter = new Counter({
    name: "chopsticks_commands_error_total",
    help: "Total command errors",
    labelNames: ["command"]
  });
  registry.registerMetric(commandErrorCounter);

  commandLatency = new Histogram({
    name: "chopsticks_commands_latency_ms",
    help: "Command latency in ms",
    labelNames: ["command"],
    buckets: [25, 50, 100, 200, 400, 800, 1600, 3200]
  });
  registry.registerMetric(commandLatency);

  agentGauge = new Gauge({
    name: "chopsticks_agents_total",
    help: "Agent count by state",
    labelNames: ["state"]
  });
  registry.registerMetric(agentGauge);

  function createServer() {
    return http.createServer(async (req, res) => {
      const url = req.url || "/";
      const security = readHealthSecurityConfig(process.env);
      
      // Health check compatibility (`/healthz` primary, `/health` alias).
      if (url.startsWith("/healthz") || url.startsWith("/health")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ts: Date.now() }));
        return;
      }

      // Prometheus metrics
      if (url.startsWith("/metrics")) {
        if (!isHealthAuthorized(req, security.metricsToken)) {
          res.writeHead(401, { "Content-Type": "text/plain" });
          res.end("unauthorized");
          return;
        }
        // App metrics from src/utils/metrics.js (includes agent lifecycle utilization gauges)
        if (url.startsWith("/metrics-app")) {
          res.writeHead(200, { "Content-Type": appMetricsRegister.contentType });
          res.end(await appMetricsRegister.metrics());
          return;
        }

        // Legacy health-server metrics
        res.writeHead(200, { "Content-Type": registry.contentType });
        res.end(await registry.metrics());
        return;
      }

      // Debug dashboard (HTML)
      if (url.startsWith("/debug/dashboard")) {
        if (!security.debugEnabled) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }
        if (!isHealthAuthorized(req, security.debugToken)) {
          res.writeHead(401, { "Content-Type": "text/plain" });
          res.end("unauthorized");
          return;
        }
        if (agentManager) {
          const dashboard = createDebugDashboard(agentManager);
          await dashboard(req, res);
        } else {
          res.writeHead(503, { "Content-Type": "text/plain" });
          res.end("Dashboard not available - agent manager not initialized");
        }
        return;
      }

      // Debug info (JSON)
      if (url.startsWith("/debug")) {
        if (!security.debugEnabled) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
          return;
        }
        if (!isHealthAuthorized(req, security.debugToken)) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "unauthorized" }));
          return;
        }
        if (agentManager) {
          const handler = createDebugHandler(agentManager);
          await handler(req, res);
        } else {
          res.writeHead(503, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Debug endpoint not available - agent manager not initialized" }));
        }
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    });
  }

  function tryListen(p, remaining) {
    const srv = createServer();
    srv.on("error", err => {
      if (err?.code === "EADDRINUSE" && allowFallback && remaining > 0) {
        try {
          srv.close();
        } catch {}
        const next = p + 1;
        console.warn(`[health] port ${p} in use; trying ${next}`);
        tryListen(next, remaining - 1);
        return;
      }
      if (err?.code === "EADDRINUSE") {
        console.warn(`[health] port ${p} already in use; metrics disabled for this instance.`);
        try {
          srv.close();
        } catch {}
        server = null;
        return;
      }
      console.error("[health] server error", err?.message ?? err);
    });

    srv.listen(p, () => {
      server = srv;
      server.__port = p;
      console.log(`[health] listening on :${p}`);
    });
  }

  tryListen(port, maxBump);

  return server;
}

export function metricCommand(commandName) {
  if (!commandCounter) return;
  try {
    commandCounter.inc({ command: String(commandName || "unknown") }, 1);
  } catch {}
}

export function metricCommandError(commandName) {
  if (!commandErrorCounter) return;
  try {
    commandErrorCounter.inc({ command: String(commandName || "unknown") }, 1);
  } catch {}
}

export function metricCommandLatency(commandName, ms) {
  if (!commandLatency) return;
  const n = Number(ms);
  if (!Number.isFinite(n)) return;
  try {
    commandLatency.observe({ command: String(commandName || "unknown") }, n);
  } catch {}
}

export function recordCommandStat(commandName, ok, ms, guildId = null) {
  const key = String(commandName || "unknown");
  const cur = commandStats.get(key) ?? { ok: 0, err: 0, totalMs: 0, count: 0 };
  if (ok) cur.ok += 1;
  else cur.err += 1;
  if (Number.isFinite(ms)) {
    cur.totalMs += Math.max(0, ms);
    cur.count += 1;
  }
  commandStats.set(key, cur);

  const dcur = commandDelta.get(key) ?? { ok: 0, err: 0, totalMs: 0, count: 0 };
  if (ok) dcur.ok += 1;
  else dcur.err += 1;
  if (Number.isFinite(ms)) {
    dcur.totalMs += Math.max(0, ms);
    dcur.count += 1;
  }
  commandDelta.set(key, dcur);

  if (guildId) {
    const gid = String(guildId);
    const gmap = commandStatsByGuild.get(gid) ?? new Map();
    const gcur = gmap.get(key) ?? { ok: 0, err: 0, totalMs: 0, count: 0 };
    if (ok) gcur.ok += 1;
    else gcur.err += 1;
    if (Number.isFinite(ms)) {
      gcur.totalMs += Math.max(0, ms);
      gcur.count += 1;
    }
    gmap.set(key, gcur);
    commandStatsByGuild.set(gid, gmap);

    const dmap = commandDeltaByGuild.get(gid) ?? new Map();
    const dcur2 = dmap.get(key) ?? { ok: 0, err: 0, totalMs: 0, count: 0 };
    if (ok) dcur2.ok += 1;
    else dcur2.err += 1;
    if (Number.isFinite(ms)) {
      dcur2.totalMs += Math.max(0, ms);
      dcur2.count += 1;
    }
    dmap.set(key, dcur2);
    commandDeltaByGuild.set(gid, dmap);
  }
}

export function getCommandStats() {
  const out = [];
  for (const [command, v] of commandStats.entries()) {
    const avgMs = v.count ? Math.round(v.totalMs / v.count) : 0;
    out.push({ command, ok: v.ok, err: v.err, avgMs });
  }
  out.sort((a, b) => (b.ok + b.err) - (a.ok + a.err));
  return out.slice(0, 50);
}

export function getCommandStatsForGuild(guildId) {
  if (!guildId) return [];
  const gmap = commandStatsByGuild.get(String(guildId));
  if (!gmap) return [];
  const out = [];
  for (const [command, v] of gmap.entries()) {
    const avgMs = v.count ? Math.round(v.totalMs / v.count) : 0;
    out.push({ command, ok: v.ok, err: v.err, avgMs });
  }
  out.sort((a, b) => (b.ok + b.err) - (a.ok + a.err));
  return out.slice(0, 50);
}

export function getAndResetCommandDeltas() {
  const global = [];
  for (const [command, v] of commandDelta.entries()) {
    global.push({ command, ...v });
  }
  commandDelta.clear();

  const perGuild = [];
  for (const [guildId, map] of commandDeltaByGuild.entries()) {
    for (const [command, v] of map.entries()) {
      perGuild.push({ guildId, command, ...v });
    }
  }
  commandDeltaByGuild.clear();

  return { global, perGuild };
}

export function metricAgents({ ready = 0, busy = 0, total = 0 } = {}) {
  if (!agentGauge) return;
  try {
    agentGauge.set({ state: "ready" }, Number(ready) || 0);
    agentGauge.set({ state: "busy" }, Number(busy) || 0);
    agentGauge.set({ state: "total" }, Number(total) || 0);
  } catch {}
}
