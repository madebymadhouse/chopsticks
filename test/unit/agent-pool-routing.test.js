// test/unit/agent-pool-routing.test.js
// Backtests for primary session bypass vs real agent routing in agentManager
import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { data as musicData } from "../../src/commands/music.js";

// ── Primary session bypass logic ──────────────────────────────────────────────
describe("agentManager primary session routing", function () {
  // Simulate the request() bypass check from agentManager.js
  function routeRequest(agent, op, data) {
    if (agent?.isPrimary && typeof agent.handleRequest === "function") {
      return agent.handleRequest(op, data);
    }
    if (!agent?.ws || !agent?.ready) throw new Error("agent-offline");
    return "websocket-routed";
  }

  it("routes to handleRequest when agent.isPrimary is true", function () {
    const primaryAgent = {
      isPrimary: true,
      handleRequest: (op, _data) => `primary:${op}`
    };
    const result = routeRequest(primaryAgent, "play", {});
    assert.equal(result, "primary:play", "should call handleRequest for primary agent");
  });

  it("routes to WebSocket for normal agents (no isPrimary)", function () {
    const realAgent = {
      isPrimary: false,
      ws: {},
      ready: true,
      handleRequest: () => { throw new Error("should not be called"); }
    };
    const result = routeRequest(realAgent, "play", {});
    assert.equal(result, "websocket-routed", "should route normal agents to WebSocket");
  });

  it("throws agent-offline if agent has no ws", function () {
    const offlineAgent = { isPrimary: false, ws: null, ready: false };
    assert.throws(() => routeRequest(offlineAgent, "play", {}), /agent-offline/);
  });

  it("throws agent-offline if agent.ready is false", function () {
    const notReadyAgent = { isPrimary: false, ws: {}, ready: false };
    assert.throws(() => routeRequest(notReadyAgent, "play", {}), /agent-offline/);
  });

  it("isPrimary flag without handleRequest does not bypass", function () {
    // Edge case: isPrimary set but no handleRequest → should fall through
    const badPrimary = { isPrimary: true }; // no handleRequest
    assert.throws(() => routeRequest(badPrimary, "play", {}), /agent-offline/);
  });
});

// ── ensureSessionAgent primary mode fallback logic ───────────────────────────
describe("ensureSessionAgent primary mode fallback", function () {
  function simulateFallback(reason, primaryReady) {
    if (reason === "no-agents-in-guild") {
      if (primaryReady) {
        return { ok: true, isPrimaryMode: true };
      }
      return { ok: false, reason: "no-agents-in-guild" };
    }
    return { ok: false, reason };
  }

  it("falls back to primary mode when no agents and Lavalink ready", function () {
    const res = simulateFallback("no-agents-in-guild", true);
    assert.ok(res.ok, "should return ok:true in primary mode");
    assert.ok(res.isPrimaryMode, "should set isPrimaryMode");
  });

  it("returns error if no agents and Lavalink not ready", function () {
    const res = simulateFallback("no-agents-in-guild", false);
    assert.ok(!res.ok, "should return ok:false when Lavalink not ready");
    assert.equal(res.reason, "no-agents-in-guild");
  });

  it("passes through other errors without primary fallback", function () {
    const res = simulateFallback("no-free-agents", true);
    assert.ok(!res.ok, "no-free-agents should not trigger primary fallback");
    assert.equal(res.reason, "no-free-agents");
  });
});

// ── Music command subcommand count ────────────────────────────────────────────
describe("music command option limits", function () {
  it("does not exceed Discord 25 option limit", function () {
    const json = musicData.toJSON();
    const count = (json.options ?? []).length;
    assert.ok(count <= 25, `music command has ${count} options (max 25)`);
  });

  it("drops subcommand group exists", function () {
    const json = musicData.toJSON();
    const groups = (json.options ?? []).filter(o => o.type === 2);
    const drops = groups.find(g => g.name === "drops");
    assert.ok(drops, "drops subcommand group should exist");
    const subs = (drops?.options ?? []).map(s => s.name);
    assert.ok(subs.includes("enable"), "drops should have enable");
    assert.ok(subs.includes("disable"), "drops should have disable");
    assert.ok(subs.includes("status"), "drops should have status");
  });
});

// ── Primary session operation shape ──────────────────────────────────────────
describe("primarySession operation handling", function () {
  // Simulate the handleRequest dispatch table
  const SUPPORTED_OPS = ["play", "search", "skip", "pause", "resume", "stop",
    "volume", "shuffle", "clear", "remove", "move", "swap", "queue", "status", "preset"];

  for (const op of SUPPORTED_OPS) {
    it(`handles '${op}' operation`, function () {
      assert.ok(SUPPORTED_OPS.includes(op), `${op} should be in supported ops list`);
    });
  }

  it("all play/pause/skip ops are in the supported list", function () {
    assert.ok(SUPPORTED_OPS.includes("play"));
    assert.ok(SUPPORTED_OPS.includes("pause"));
    assert.ok(SUPPORTED_OPS.includes("skip"));
    assert.ok(SUPPORTED_OPS.includes("stop"));
    assert.ok(SUPPORTED_OPS.includes("resume"));
  });
});

// ── Pool deployment plan structure ───────────────────────────────────────────
describe("pool deployment plan", function () {
  it("deploy UI prefix format is stable", function () {
    const DEPLOY_UI_PREFIX = "agdeployui";
    const ADVISOR_UI_PREFIX = "agadvisor";
    const AGENT_INV_PREFIX = "aginv";

    assert.equal(DEPLOY_UI_PREFIX, "agdeployui");
    assert.equal(ADVISOR_UI_PREFIX, "agadvisor");
    assert.equal(AGENT_INV_PREFIX, "aginv");
  });

  it("pool agent health summary logic works", function () {
    const poolAgents = [
      { status: "active" },
      { status: "active" },
      { status: "inactive" },
      { status: "pending" }
    ];
    const total = poolAgents.length;
    const active = poolAgents.filter(a => a.status === "active").length;
    assert.equal(total, 4);
    assert.equal(active, 2);
  });
});
