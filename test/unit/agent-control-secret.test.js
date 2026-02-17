import assert from "node:assert/strict";
import { AgentManager } from "../../src/agents/agentManager.js";

function makeWs() {
  return {
    __agentId: null,
    __remoteAddress: "127.0.0.1",
    _sent: [],
    _closed: null,
    send(payload) {
      this._sent.push(String(payload));
    },
    close(code, reason) {
      this._closed = { code, reason };
    }
  };
}

describe("Agent Control Plane Secret", () => {
  it("rejects hello when controller requires secret and agent omits it", () => {
    const prev = process.env.AGENT_RUNNER_SECRET;
    process.env.AGENT_RUNNER_SECRET = "secret";
    try {
      const mgr = new AgentManager({ host: "127.0.0.1", port: 0 });
      const ws = makeWs();
      mgr.handleHello(ws, { type: "hello", agentId: "a1", protocolVersion: "1.0.0", ready: true });
      assert.ok(ws._closed, "expected connection to be closed");
      assert.equal(ws._closed.code, 1008);
    } finally {
      process.env.AGENT_RUNNER_SECRET = prev;
    }
  });

  it("accepts hello when controller requires secret and agent presents it", () => {
    const prev = process.env.AGENT_RUNNER_SECRET;
    process.env.AGENT_RUNNER_SECRET = "secret";
    try {
      const mgr = new AgentManager({ host: "127.0.0.1", port: 0 });
      const ws = makeWs();
      mgr.handleHello(ws, {
        type: "hello",
        agentId: "a1",
        protocolVersion: "1.0.0",
        ready: true,
        runnerSecret: "secret",
        guildIds: []
      });
      assert.equal(ws._closed, null);
      assert.ok(mgr.liveAgents.get("a1"));
    } finally {
      process.env.AGENT_RUNNER_SECRET = prev;
    }
  });
});

