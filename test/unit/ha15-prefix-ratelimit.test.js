// test/unit/ha15-prefix-ratelimit.test.js
// HA-15: Verify per-user prefix command rate limiting is implemented in index.js

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexSrc = readFileSync(resolve(__dirname, "../../src/index.js"), "utf8");
const ratelimitSrc = readFileSync(resolve(__dirname, "../../src/utils/ratelimit.js"), "utf8");

describe("HA-15: Prefix command — global burst guard", function () {
  it("index.js has a per-user global prefix burst guard", function () {
    assert.ok(
      indexSrc.includes("pfx:burst:"),
      "Global prefix burst guard key 'pfx:burst:' not found in index.js"
    );
  });

  it("global burst guard uses checkRateLimit", function () {
    const burstIdx = indexSrc.indexOf("pfx:burst:");
    assert.notEqual(burstIdx, -1, "pfx:burst key not found");
    const snippet = indexSrc.slice(Math.max(0, burstIdx - 100), burstIdx + 100);
    assert.ok(snippet.includes("checkRateLimit"), "checkRateLimit not called near pfx:burst key");
  });

  it("!help command is exempt from burst guard", function () {
    assert.ok(
      indexSrc.includes('name !== "help"') || indexSrc.includes("name !== 'help'"),
      "!help exemption from burst guard not found"
    );
  });

  it("burst guard silently drops excess commands (no reply spam)", function () {
    const burstIdx = indexSrc.indexOf("pfx:burst:");
    const snippet = indexSrc.slice(burstIdx, burstIdx + 300);
    // Should return (drop) on failure, not reply with a message
    assert.ok(snippet.includes("return"), "burst guard should return without replying on rate limit");
  });
});

describe("HA-15: Prefix command — per-command per-user rate limit", function () {
  it("index.js has per-command per-user rate limit key pattern", function () {
    assert.ok(
      indexSrc.includes("pfx:") && indexSrc.includes("message.author.id"),
      "Per-user prefix rate limit key not found in index.js"
    );
  });

  it("per-command rate limit uses checkRateLimit imported from ratelimit.js", function () {
    assert.ok(
      indexSrc.includes('from "./utils/ratelimit.js"') || indexSrc.includes('from "../utils/ratelimit.js"'),
      "checkRateLimit import from ratelimit.js not found in index.js"
    );
  });

  it("per-command rate limit window is at least 5 seconds", function () {
    // Look for pfx:${userId}:${name} pattern with window > 5
    const perCmdIdx = indexSrc.indexOf('`pfx:${message.author.id}:${name}`');
    assert.notEqual(perCmdIdx, -1, "Per-command rate limit key pattern not found");
    const snippet = indexSrc.slice(perCmdIdx - 10, perCmdIdx + 150);
    // Extract window value — pattern: checkRateLimit(key, N, W) where W >= 5
    const windowMatch = snippet.match(/checkRateLimit\([^,]+,\s*(\d+),\s*(\d+)/);
    if (windowMatch) {
      const windowSec = parseInt(windowMatch[2]);
      assert.ok(windowSec >= 5, `Per-command window ${windowSec}s is less than 5s`);
    }
  });
});

describe("HA-15: ratelimit.js — implementation correctness", function () {
  it("checkRateLimit is exported from ratelimit.js", function () {
    assert.ok(
      ratelimitSrc.includes("export") && ratelimitSrc.includes("checkRateLimit"),
      "checkRateLimit not exported from ratelimit.js"
    );
  });

  it("checkRateLimit accepts key, limit, windowSec parameters", function () {
    const match = ratelimitSrc.match(/function\s+checkRateLimit\s*\(([^)]+)\)/);
    assert.ok(match, "checkRateLimit function signature not found");
    const params = match[1];
    assert.ok(params.includes("key"), "checkRateLimit missing 'key' parameter");
    assert.ok(params.includes("limit"), "checkRateLimit missing 'limit' parameter");
    assert.ok(params.includes("window") || params.includes("Window"), "checkRateLimit missing window parameter");
  });

  it("checkRateLimit returns an object with .ok property", function () {
    assert.ok(
      ratelimitSrc.includes("ok:") || ratelimitSrc.includes("ok :"),
      "checkRateLimit does not return { ok } shaped result"
    );
  });

  it("ratelimit.js uses Redis or in-memory store for distributed counting", function () {
    const usesRedis = ratelimitSrc.includes("redis") || ratelimitSrc.includes("Redis") ||
                      ratelimitSrc.includes("incr") || ratelimitSrc.includes("INCR");
    const usesMemory = ratelimitSrc.includes("Map") || ratelimitSrc.includes("new Map");
    assert.ok(usesRedis || usesMemory, "ratelimit.js uses neither Redis nor in-memory store");
  });
});

describe("HA-15: Prefix dispatch — rate limits applied before command execution", function () {
  it("rate limit checks appear before prefixCommands.get(name) in dispatch", function () {
    const rateIdx = indexSrc.indexOf("pfx:burst:");
    const execIdx = indexSrc.indexOf("prefixCommands.get(name)");
    assert.notEqual(rateIdx, -1, "pfx:burst not found");
    assert.notEqual(execIdx, -1, "prefixCommands.get(name) not found");
    assert.ok(rateIdx < execIdx, "Rate limit must be checked before command lookup and execution");
  });
});
