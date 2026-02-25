// test/unit/ha18-ws-flood.test.js
// HA-18: WebSocket flood protection — size guard, rate limit, unknown type logging

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(resolve(__dirname, "../../src/agents/agentManager.js"), "utf8");

// ── 64 KB size guard ──────────────────────────────────────────────────────────

describe("HA-18: WS flood — 64 KB frame size guard", function () {
  it("handleMessage checks frame byte length against 65536", function () {
    assert.ok(code.includes("65536"), "64 KB (65536) size limit not found in agentManager.js");
  });

  it("oversized frame sends error response before returning", function () {
    const sizeGuardIdx = code.indexOf("65536");
    const frameErrorIdx = code.indexOf('"Frame too large"');
    assert.notEqual(frameErrorIdx, -1, '"Frame too large" error message not found');
    assert.ok(sizeGuardIdx < frameErrorIdx, "size guard must appear before Frame too large reply");
  });

  it("uses Buffer.byteLength or Buffer.isBuffer for size measurement", function () {
    assert.ok(
      code.includes("Buffer.isBuffer") || code.includes("Buffer.byteLength"),
      "Buffer size measurement missing — cannot accurately measure WS frame size"
    );
  });
});

// ── Per-connection rate limit ─────────────────────────────────────────────────

describe("HA-18: WS flood — per-connection message rate limit (100/s)", function () {
  it("connection setup initialises __msgCount and __msgWindowStart", function () {
    assert.ok(code.includes("__msgCount = 0"), "__msgCount init not found on connection setup");
    assert.ok(code.includes("__msgWindowStart = Date.now()"), "__msgWindowStart init not found");
  });

  it("handleMessage increments __msgCount", function () {
    assert.ok(code.includes("ws.__msgCount++"), "__msgCount++ not found in handleMessage");
  });

  it("handleMessage rejects when count exceeds 100", function () {
    assert.ok(code.includes("__msgCount > 100"), "flood threshold (> 100) not found");
  });

  it("flood detection resets window after 1000ms", function () {
    assert.ok(code.includes("__msgWindowStart > 1000") || code.includes("> 1000"), "1000ms window reset not found");
  });

  it("flood guard logs a warning with agentId", function () {
    assert.ok(
      code.includes("WS flood detected"),
      "flood detection warning message not found"
    );
  });
});

// ── Unknown message type logging ──────────────────────────────────────────────

describe("HA-18: WS flood — unknown message type logging", function () {
  it("handleMessage logs unknown msg.type instead of silently ignoring", function () {
    assert.ok(
      code.includes("Unknown WS message type"),
      "Unknown WS message type log not found — must not silently ignore unknown types"
    );
  });

  it("unknown type warning includes the type value and agentId", function () {
    const warnIdx = code.indexOf("Unknown WS message type");
    assert.notEqual(warnIdx, -1, "Unknown WS message type log not found");
    const snippet = code.slice(warnIdx, warnIdx + 200);
    assert.ok(snippet.includes("msg?.type") || snippet.includes("type:"), "msg.type not included in unknown-type warning");
  });
});

// ── Flood guard is sequential (size check before rate check) ─────────────────

describe("HA-18: WS flood — guard order", function () {
  it("size guard appears before rate-limit guard in handleMessage", function () {
    const sizeIdx = code.indexOf("byteLen > 65536");
    const rateIdx = code.indexOf("__msgCount > 100");
    assert.notEqual(sizeIdx, -1, "byteLen > 65536 guard not found");
    assert.notEqual(rateIdx, -1, "__msgCount > 100 rate guard not found");
    assert.ok(sizeIdx < rateIdx, "size guard must run before rate-limit guard");
  });
});
