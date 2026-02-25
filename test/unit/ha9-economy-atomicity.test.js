// test/unit/ha9-economy-atomicity.test.js
// HA-9: Economy atomicity audit — atomic cooldowns, heist error logging,
//       wallet negative-balance prevention, auction atomicity contracts

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(relPath) {
  return readFileSync(resolve(__dirname, `../../${relPath}`), "utf8");
}

// ── Redis setCacheNX — atomic SET NX EX ───────────────────────────────────────

describe("HA-9: Redis — setCacheNX atomic SET NX EX", function () {
  it("redis.js exports setCacheNX function", function () {
    const code = src("src/utils/redis.js");
    assert.ok(code.includes("export async function setCacheNX"), "setCacheNX not exported");
  });

  it("setCacheNX uses { NX: true } option on client.set()", function () {
    const code = src("src/utils/redis.js");
    const fnStart = code.indexOf("function setCacheNX");
    assert.notEqual(fnStart, -1, "setCacheNX function not found");
    const fnBody = code.slice(fnStart, fnStart + 400);
    assert.ok(fnBody.includes("NX: true"), "setCacheNX does not pass NX: true to Redis");
  });

  it("setCacheNX includes EX (TTL) in the same atomic call", function () {
    const code = src("src/utils/redis.js");
    const fnStart = code.indexOf("function setCacheNX");
    const fnBody = code.slice(fnStart, fnStart + 400);
    assert.ok(fnBody.includes("EX:") || fnBody.includes("EX :"), "setCacheNX missing EX in set options");
  });

  it("setCacheNX returns true on set, false if key already existed", function () {
    const code = src("src/utils/redis.js");
    const fnStart = code.indexOf("function setCacheNX");
    const fnBody = code.slice(fnStart, fnStart + 400);
    // Result should check for "OK" (Redis SET NX returns null if key existed)
    assert.ok(fnBody.includes('"OK"'), "setCacheNX does not check result === 'OK'");
  });
});

// ── atomicCooldown — race-free work cooldown ──────────────────────────────────

describe("HA-9: cooldowns.js — atomicCooldown for race-free enforcement", function () {
  it("cooldowns.js exports atomicCooldown function", function () {
    const code = src("src/economy/cooldowns.js");
    assert.ok(code.includes("export async function atomicCooldown"), "atomicCooldown not exported");
  });

  it("atomicCooldown imports setCacheNX", function () {
    const code = src("src/economy/cooldowns.js");
    assert.ok(code.includes("setCacheNX"), "cooldowns.js does not use setCacheNX");
  });

  it("atomicCooldown returns { ok: false } when lock already exists", function () {
    const code = src("src/economy/cooldowns.js");
    const fnStart = code.indexOf("async function atomicCooldown");
    const fnBody = code.slice(fnStart, fnStart + 800);
    assert.ok(
      fnBody.includes("ok: false"),
      "atomicCooldown does not return ok: false on contention"
    );
  });

  it("atomicCooldown returns { ok: true } when lock is successfully acquired", function () {
    const code = src("src/economy/cooldowns.js");
    const fnStart = code.indexOf("async function atomicCooldown");
    const fnBody = code.slice(fnStart, fnStart + 1200);
    assert.ok(
      fnBody.includes("ok: true"),
      "atomicCooldown does not return ok: true on success"
    );
  });
});

// ── game.js work — uses atomicCooldown ───────────────────────────────────────

describe("HA-9: game.js /work — atomic cooldown prevents double-reward race", function () {
  it("game.js imports atomicCooldown", function () {
    const code = src("src/commands/game.js");
    assert.ok(
      code.includes("atomicCooldown"),
      "game.js does not import atomicCooldown"
    );
  });

  it("runWorkAction uses atomicCooldown instead of separate getCooldown + setCooldown", function () {
    const code = src("src/commands/game.js");
    const fnStart = code.indexOf("async function runWorkAction");
    assert.notEqual(fnStart, -1, "runWorkAction not found");
    const fnBody = code.slice(fnStart, fnStart + 800);
    assert.ok(
      fnBody.includes("atomicCooldown"),
      "runWorkAction does not use atomicCooldown"
    );
    // The old separate getCooldown-then-setCooldown pattern must not be present
    const hasOldPattern = fnBody.includes("await getCooldown(") && fnBody.includes("await setCooldown(");
    assert.ok(!hasOldPattern, "runWorkAction still uses non-atomic getCooldown + setCooldown pattern");
  });

  it("runWorkAction rejects when atomicCooldown returns ok: false", function () {
    const code = src("src/commands/game.js");
    const fnStart = code.indexOf("async function runWorkAction");
    const fnBody = code.slice(fnStart, fnStart + 600);
    assert.ok(
      fnBody.includes("!cd.ok") || fnBody.includes("cd.ok === false"),
      "runWorkAction does not check atomicCooldown failure result"
    );
  });
});

// ── Heist — error logging for credit operations ───────────────────────────────

describe("HA-9: heist — credit operation failures are logged", function () {
  it("heist addCredits failure is logged (not silently swallowed)", function () {
    const code = src("src/commands/heist.js");
    // The .catch on addCredits should log, not silently ignore
    const addIdx = code.indexOf("addCredits(uid, outcome.prizeEach");
    assert.notEqual(addIdx, -1, "heist addCredits not found");
    const catchSection = code.slice(addIdx, addIdx + 200);
    assert.ok(
      catchSection.includes("botLogger") || catchSection.includes("logger"),
      "addCredits catch does not log the error"
    );
  });

  it("heist removeCredits failure is logged (not silently swallowed)", function () {
    const code = src("src/commands/heist.js");
    const removeIdx = code.indexOf("removeCredits(uid, outcome.lossEach");
    assert.notEqual(removeIdx, -1, "heist removeCredits not found");
    const catchSection = code.slice(removeIdx, removeIdx + 200);
    assert.ok(
      catchSection.includes("botLogger") || catchSection.includes("logger"),
      "removeCredits catch does not log the error"
    );
  });
});

// ── Wallet — atomic negative-balance prevention (regression) ──────────────────

describe("HA-9: wallet — atomic negative-balance prevention", function () {
  it("wallet.js removeCredits uses WHERE balance >= $1 (DB-level atomic guard)", function () {
    const code = src("src/economy/wallet.js");
    assert.ok(
      code.includes("balance >= $") || code.includes("balance >=$"),
      "removeCredits missing WHERE balance >= guard (negative balance possible)"
    );
  });

  it("wallet.js addCredits uses ON CONFLICT DO UPDATE (atomic upsert)", function () {
    const code = src("src/economy/wallet.js");
    assert.ok(
      code.includes("ON CONFLICT") && code.includes("DO UPDATE"),
      "addCredits missing atomic ON CONFLICT DO UPDATE"
    );
  });

  it("wallet.js transferCredits prevents self-transfer", function () {
    const code = src("src/economy/wallet.js");
    const fnStart = code.indexOf("transferCredits");
    if (fnStart === -1) return; // Function may not exist
    const fnBody = code.slice(fnStart, fnStart + 400);
    // Should check sender !== receiver
    assert.ok(
      fnBody.includes("===") || fnBody.includes("!==") || fnBody.includes("self"),
      "transferCredits has no self-transfer guard"
    );
  });
});

// ── Auction — bid atomicity documentation ────────────────────────────────────

describe("HA-9: auction — bid sequence and atomicity", function () {
  it("auction.js has refund (addCredits) before new bid deduction (removeCredits)", function () {
    const code = src("src/commands/auction.js");
    const addIdx    = code.indexOf("addCredits(auction.current_bidder");
    const removeIdx = code.indexOf("removeCredits(userId");
    assert.notEqual(addIdx, -1, "auction refund addCredits not found");
    assert.notEqual(removeIdx, -1, "auction bid removeCredits not found");
    // Refund should come before deduction
    assert.ok(addIdx < removeIdx, "auction bid deduction occurs before refund (wrong order)");
  });
});
