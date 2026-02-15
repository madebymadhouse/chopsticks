/**
 * Level 2: 60-Second Debugging Dashboard
 * 
 * Quick health and debugging endpoint that answers:
 * - What failed and why?
 * - What's the current state?
 * - Where should I look?
 * 
 * Accessible at: http://localhost:8080/debug
 */

import { logger } from './logger.js';

export function createDebugHandler(agentManager) {
  return async function debugHandler(req, res) {
    try {
      const now = Date.now();
      const agents = Array.from(agentManager?.liveAgents?.values() || []);
      
      // Agent status breakdown
      const connected = agents.length;
      const ready = agents.filter(a => a.ready && !a.busyKey).length;
      const busy = agents.filter(a => a.busyKey).length;
      const offline = agents.filter(a => !a.ready).length;
      
      // Session breakdown
      const musicSessions = agentManager?.sessions?.size || 0;
      const assistantSessions = agentManager?.assistantSessions?.size || 0;
      
      // Agent details
      const agentDetails = agents.map(a => ({
        agentId: a.agentId,
        tag: a.tag,
        ready: a.ready,
        busy: !!a.busyKey,
        busyKind: a.busyKind,
        guildCount: a.guildIds?.size || 0,
        protocolVersion: a.protocolVersion,
        lastSeen: a.lastSeen ? new Date(a.lastSeen).toISOString() : null,
        uptime: a.startedAt ? Math.floor((now - a.startedAt) / 1000) + 's' : null
      }));
      
      // Recent errors (from logger if we tracked them)
      // For now, we'll show placeholder
      const recentErrors = [];
      
      // Session details
      const sessionDetails = [];
      if (agentManager?.sessions) {
        for (const [key, agentId] of agentManager.sessions.entries()) {
          const [guildId, voiceChannelId] = key.split(':');
          const agent = agentManager.liveAgents.get(agentId);
          sessionDetails.push({
            type: 'music',
            guildId,
            voiceChannelId,
            agentId,
            agentReady: agent?.ready || false,
            agentOnline: !!agent
          });
        }
      }
      
      // Health status
      const health = {
        overall: connected > 0 && ready > 0 ? 'healthy' : 'degraded',
        agents: connected > 0 ? 'ok' : 'no agents',
        sessions: musicSessions > 0 || assistantSessions > 0 ? 'active' : 'idle'
      };
      
      const debug = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        health,
        agents: {
          connected,
          ready,
          busy,
          offline,
          details: agentDetails
        },
        sessions: {
          music: musicSessions,
          assistant: assistantSessions,
          total: musicSessions + assistantSessions,
          details: sessionDetails
        },
        recentErrors,
        // Quick diagnostic checks
        diagnostics: {
          hasAgents: connected > 0,
          hasReadyAgents: ready > 0,
          hasActiveSessions: (musicSessions + assistantSessions) > 0,
          allAgentsBusy: connected > 0 && ready === 0 && busy > 0,
          protocolVersionMismatch: agents.some(a => a.protocolVersion !== '1.0.0')
        },
        // Quick actions
        actions: {
          noAgents: connected === 0 ? 'Deploy agents with /agents deploy <count>' : null,
          allBusy: (connected > 0 && ready === 0 && busy > 0) ? 'Wait for agents to free up or deploy more' : null,
          noSessions: (musicSessions + assistantSessions) === 0 ? 'No active sessions - all agents idle' : null
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(debug));
      
    } catch (error) {
      logger.error('Debug endpoint error', { error });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Debug endpoint failed',
        message: error.message
      }));
    }
  };
}

// HTML dashboard for human-friendly view
export function createDebugDashboard(agentManager) {
  return async function dashboardHandler(req, res) {
    try {
      const now = Date.now();
      const agents = Array.from(agentManager?.liveAgents?.values() || []);
      
      const connected = agents.length;
      const ready = agents.filter(a => a.ready && !a.busyKey).length;
      const busy = agents.filter(a => a.busyKey).length;
      
      const musicSessions = agentManager?.sessions?.size || 0;
      const assistantSessions = agentManager?.assistantSessions?.size || 0;
      
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Chopsticks Debug Dashboard</title>
  <meta http-equiv="refresh" content="5">
  <style>
    body { font-family: 'Courier New', monospace; margin: 20px; background: #1a1a1a; color: #0f0; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #0f0; border-bottom: 2px solid #0f0; padding-bottom: 10px; }
    h2 { color: #0f0; margin-top: 30px; }
    .status-good { color: #0f0; }
    .status-warn { color: #ff0; }
    .status-bad { color: #f00; }
    .metric { background: #2a2a2a; padding: 15px; margin: 10px 0; border-left: 4px solid #0f0; }
    .metric-title { font-weight: bold; font-size: 14px; }
    .metric-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
    .agent-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 10px; }
    .agent-card { background: #2a2a2a; padding: 10px; border-left: 4px solid #0f0; }
    .agent-ready { border-left-color: #0f0; }
    .agent-busy { border-left-color: #ff0; }
    .agent-offline { border-left-color: #f00; }
    pre { background: #2a2a2a; padding: 10px; overflow-x: auto; }
    .refresh { color: #888; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🥢 Chopsticks Debug Dashboard</h1>
    <p class="refresh">Auto-refresh: 5s | Last update: ${new Date().toLocaleTimeString()}</p>
    
    <h2>⚡ Quick Status</h2>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
      <div class="metric">
        <div class="metric-title">Agents Connected</div>
        <div class="metric-value ${connected > 0 ? 'status-good' : 'status-bad'}">${connected}</div>
      </div>
      <div class="metric">
        <div class="metric-title">Agents Ready</div>
        <div class="metric-value ${ready > 0 ? 'status-good' : 'status-warn'}">${ready}</div>
      </div>
      <div class="metric">
        <div class="metric-title">Agents Busy</div>
        <div class="metric-value">${busy}</div>
      </div>
      <div class="metric">
        <div class="metric-title">Active Sessions</div>
        <div class="metric-value">${musicSessions + assistantSessions}</div>
      </div>
    </div>
    
    <h2>🤖 Agent Details</h2>
    <div class="agent-list">
      ${agents.map(a => `
        <div class="agent-card ${a.ready ? (a.busyKey ? 'agent-busy' : 'agent-ready') : 'agent-offline'}">
          <strong>${a.tag || a.agentId}</strong><br>
          Status: ${a.ready ? (a.busyKey ? '⏳ Busy (' + a.busyKind + ')' : '✅ Ready') : '🔴 Offline'}<br>
          Guilds: ${a.guildIds?.size || 0}<br>
          Version: ${a.protocolVersion || 'unknown'}<br>
          Uptime: ${a.startedAt ? Math.floor((now - a.startedAt) / 1000) + 's' : 'unknown'}
        </div>
      `).join('')}
    </div>
    
    <h2>📊 Sessions</h2>
    <div class="metric">
      <div class="metric-title">Music Sessions</div>
      <div class="metric-value">${musicSessions}</div>
    </div>
    <div class="metric">
      <div class="metric-title">Assistant Sessions</div>
      <div class="metric-value">${assistantSessions}</div>
    </div>
    
    <h2>🔗 API Endpoints</h2>
    <pre>
GET  /healthz       - Health check
GET  /metrics       - Prometheus metrics
GET  /metrics-app   - App metrics (agent lifecycle/utilization)
GET  /debug         - Debug info (JSON)
GET  /debug/dashboard - This dashboard (HTML)
    </pre>
    
    <p style="color: #888; margin-top: 50px; text-align: center;">
      Level 2: Observability First | Maturity Model
    </p>
  </div>
</body>
</html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(200);
      res.end(html);
      
    } catch (error) {
      logger.error('Dashboard endpoint error', { error });
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Dashboard error: ' + error.message);
    }
  };
}

export default { createDebugHandler, createDebugDashboard };
