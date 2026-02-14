// src/music/service.js
export function getSessionAgent(guildId, voiceChannelId) {
  const mgr = global.agentManager;
  if (!mgr) return { ok: false, reason: "agents-not-ready" };
  return mgr.getSessionAgent(guildId, voiceChannelId);
}

export function ensureSessionAgent(guildId, voiceChannelId, { textChannelId, ownerUserId } = {}) {
  const mgr = global.agentManager;
  if (!mgr) return { ok: false, reason: "agents-not-ready" };
  return mgr.ensureSessionAgent(guildId, voiceChannelId, { textChannelId, ownerUserId });
}

export function releaseSession(guildId, voiceChannelId) {
  const mgr = global.agentManager;
  if (!mgr) return;
  mgr.releaseSession(guildId, voiceChannelId);
}

export async function sendAgentCommand(agent, op, data) {
  const mgr = global.agentManager;
  if (!mgr) throw new Error("agents-not-ready");
  return mgr.request(agent, op, data);
}

export function formatMusicError(reasonOrErr) {
  const msg = String(reasonOrErr?.message ?? reasonOrErr);

  // Agent availability issues - provide actionable guidance
  if (msg === "no-agents-in-guild") {
    return "❌ No agents deployed in this guild.\n💡 **Fix:** Use `/agents deploy 10` to deploy agents for music playback.";
  }
  if (msg === "no-free-agents") {
    return "⏳ All agents are currently busy.\n💡 **Try again in a few seconds** or deploy more agents with `/agents deploy <count>`.";
  }
  if (msg === "agents-not-ready") {
    return "⏳ Music agents are starting up.\n💡 **Wait 10-15 seconds** and try again.";
  }
  
  // Voice/session errors
  if (msg === "no-session") {
    return "❌ No active music session in this voice channel.\n💡 **Use `/music play <song>`** to start playing music.";
  }
  if (msg === "agent-offline") {
    return "❌ Music agent disconnected.\n💡 **Try again** - the session will reconnect automatically.";
  }
  if (msg === "agent-timeout") {
    return "⏱️ Music agent timed out.\n💡 **Try again** - if issue persists, check agent status with `/agents status`.";
  }
  if (msg === "voice-not-ready") {
    return "⏳ Voice connection is initializing.\n💡 **Wait 3-5 seconds** and try again.";
  }
  
  // Permission/ownership errors
  if (msg === "not-owner") {
    return "🔒 This voice channel is in DJ mode and owned by someone else.\n💡 **Ask the DJ** or join a different voice channel.";
  }
  if (msg === "not-in-voice") {
    return "❌ You must be in the same voice channel to control music.\n💡 **Join the voice channel** where music is playing.";
  }
  
  // System errors
  if (msg === "lavalink-not-ready") return "❌ Music system is starting up. Wait 30 seconds and try again.";
  if (msg === "player-search-missing") return "❌ Search unavailable - Lavalink configuration issue.";
  
  // Validation errors
  if (msg === "bad-volume") return "❌ Volume must be between 0 and 150.";
  if (msg === "queue-full") return "❌ Queue is full for this channel.";
  if (msg === "track-too-long") return "❌ Track exceeds server's maximum duration limit.";
  if (msg === "queue-too-long") return "❌ Adding this track would exceed the queue duration limit.";
  if (msg === "bad-index") return "❌ Invalid queue position.";
  if (msg === "bad-preset" || msg === "preset-failed") return "❌ Audio preset failed to apply.";
  
  // Generic errors
  if (msg === "missing-actor") return "❌ Missing user information.";
  if (msg === "not-in-guild") return "❌ You are not in that guild.";

  if (process.env.NODE_ENV === "development") {
    return `❌ Command failed: ${msg || "unknown error"}`;
  }
  return "❌ Command failed.";
}
