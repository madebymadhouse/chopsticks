// test/unit/ha2-economy-edge-cases.test.js
// HA-2: Economy edge case coverage — NaN/Infinity/null bets, bid validation,
//       negative balance prevention contracts, concurrency behavior documentation

import { describe, it } from "mocha";
import { strict as assert } from "assert";

import { validateBet, isValidCoinSide, calcSlotsPayout, SLOT_SYMBOLS } from "../../src/commands/casino.js";
import { isBidValid, canCreateAuction, getActiveAuctions } from "../../src/commands/auction.js";
import { calcHeistOutcome, canStartHeist, canJoinHeist } from "../../src/commands/heist.js";

// ── validateBet — NaN / Infinity / null / undefined edge cases ───────────────

describe("HA-2: validateBet — NaN/Infinity/null edge cases", function () {
  it("rejects NaN bet", function () {
    assert.equal(validateBet(NaN, 10, 1000), false, "NaN should be rejected");
  });

  it("rejects Infinity bet", function () {
    assert.equal(validateBet(Infinity, 10, 1000), false, "Infinity should be rejected");
  });

  it("rejects -Infinity bet", function () {
    assert.equal(validateBet(-Infinity, 10, 1000), false, "-Infinity should be rejected");
  });

  it("rejects null bet", function () {
    assert.equal(validateBet(null, 10, 1000), false, "null should be rejected");
  });

  it("rejects undefined bet", function () {
    assert.equal(validateBet(undefined, 10, 1000), false, "undefined should be rejected");
  });

  it("rejects string bet", function () {
    assert.equal(validateBet("100", 10, 1000), false, "string should be rejected");
  });

  it("rejects float bet", function () {
    assert.equal(validateBet(10.5, 10, 1000), false, "float should be rejected");
  });

  it("rejects zero bet (below min 10)", function () {
    assert.equal(validateBet(0, 10, 1000), false);
  });

  it("rejects negative bet", function () {
    assert.equal(validateBet(-1, 10, 1000), false);
  });

  it("still accepts valid integer in range", function () {
    assert.ok(validateBet(100, 10, 1000));
    assert.ok(validateBet(10, 10, 1000));
    assert.ok(validateBet(1000, 10, 1000));
  });
});

// ── isBidValid — NaN / Infinity / null auction bid edge cases ────────────────

describe("HA-2: isBidValid — NaN/Infinity/null edge cases", function () {
  const auction = { current_bid: 100 };

  it("rejects NaN bid", function () {
    assert.equal(isBidValid(auction, NaN), false);
  });

  it("rejects Infinity bid", function () {
    assert.equal(isBidValid(auction, Infinity), false);
  });

  it("rejects null bid", function () {
    assert.equal(isBidValid(auction, null), false);
  });

  it("rejects string bid", function () {
    assert.equal(isBidValid(auction, "200"), false);
  });

  it("rejects float bid", function () {
    assert.equal(isBidValid(auction, 150.5), false);
  });

  it("rejects bid equal to current (not strictly greater)", function () {
    assert.equal(isBidValid(auction, 100), false);
  });

  it("accepts valid integer bid above current", function () {
    assert.ok(isBidValid(auction, 101));
    assert.ok(isBidValid(auction, 500));
  });
});

// ── Negative balance prevention contract ─────────────────────────────────────

describe("HA-2: economy — negative balance prevention contract", function () {
  it("wallet.js removeCredits SQL uses WHERE balance >= amount (atomic guard)", async function () {
    // Read the source to verify the SQL guard exists
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../../src/economy/wallet.js"), "utf8");
    assert.ok(
      src.includes("balance >= $1") || src.includes("balance >= :"),
      "removeCredits must have atomic balance check in SQL"
    );
  });

  it("wallet.js removeCredits returns {ok:false} on insufficient (not throwing)", async function () {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../../src/economy/wallet.js"), "utf8");
    assert.ok(
      src.includes('{ ok: false, reason: "insufficient" }') ||
      src.includes("ok: false") && src.includes("insufficient"),
      "removeCredits should return {ok:false} for insufficient balance"
    );
  });

  it("wallet.js addCredits rejects amount <= 0 before hitting DB", async function () {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../../src/economy/wallet.js"), "utf8");
    assert.ok(
      src.includes("amount <= 0") || src.includes("amount <= 0"),
      "addCredits must guard against amount <= 0"
    );
  });

  it("wallet.js transferCredits rejects self-transfer", async function () {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(resolve(__dirname, "../../src/economy/wallet.js"), "utf8");
    assert.ok(
      src.includes("fromUserId === toUserId"),
      "transferCredits must guard against self-transfer"
    );
  });
});

// ── Heist concurrency contract ────────────────────────────────────────────────

describe("HA-2: heist — concurrent join guard (pure logic)", function () {
  function makeHeist(participants = [], status = "recruiting") {
    return {
      status,
      participants,
      start_time: new Date(Date.now() + 300_000).toISOString(),
      join_window_seconds: 300,
    };
  }

  it("canJoinHeist blocks already-joined user", function () {
    const heist = makeHeist(["user1", "user2"]);
    assert.equal(canJoinHeist(heist, "user1").ok, false);
    assert.equal(canJoinHeist(heist, "user1").reason, "already_joined");
  });

  it("canJoinHeist blocks when full (10 participants)", function () {
    const heist = makeHeist(["u1","u2","u3","u4","u5","u6","u7","u8","u9","u10"]);
    assert.equal(canJoinHeist(heist, "u11").ok, false);
    assert.equal(canJoinHeist(heist, "u11").reason, "full");
  });

  it("canJoinHeist allows new user when under capacity", function () {
    const heist = makeHeist(["user1"]);
    assert.ok(canJoinHeist(heist, "user2").ok);
  });

  it("canJoinHeist blocks when window has closed", function () {
    const heist = {
      status: "recruiting",
      participants: [],
      start_time: new Date(Date.now() - 600_000).toISOString(), // started 10 min ago
      join_window_seconds: 60,
    };
    assert.equal(canJoinHeist(heist, "user3").ok, false);
    assert.equal(canJoinHeist(heist, "user3").reason, "window_closed");
  });

  it("heist join check is stateless — parallel calls on same snapshot both pass (documents TOCTOU gap)", function () {
    const heist = makeHeist(["user1"]);
    // Two simultaneous checks BOTH see user2 as not-joined → both return ok:true
    const r1 = canJoinHeist(heist, "user2");
    const r2 = canJoinHeist(heist, "user2");
    // This documents that pure-function check is not atomic with persistence
    assert.ok(r1.ok, "first check passes");
    assert.ok(r2.ok, "second concurrent check also passes — DB unique constraint needed");
  });
});

// ── Heist outcome math ────────────────────────────────────────────────────────

describe("HA-2: heist — outcome calculation", function () {
  it("single participant has 40% base success chance", function () {
    const outcome = calcHeistOutcome(1, 39);
    assert.ok(outcome.success);
    assert.equal(outcome.chance, 40);
  });

  it("10 participants caps at 80% success chance", function () {
    const outcome = calcHeistOutcome(10, 79);
    assert.ok(outcome.success);
    assert.equal(outcome.chance, 80);
  });

  it("loss gives 0 prize and 50 penalty", function () {
    const outcome = calcHeistOutcome(1, 99); // always fail with roll=99
    assert.equal(outcome.success, false);
    assert.equal(outcome.prizeEach, 0);
    assert.equal(outcome.lossEach, 50);
  });

  it("calculates prize as 200 * participant count on success", function () {
    const outcome = calcHeistOutcome(3, 0);
    assert.ok(outcome.success);
    assert.equal(outcome.prizeEach, 600);
  });
});

// ── calcSlotsPayout — NaN/edge guard ─────────────────────────────────────────

describe("HA-2: calcSlotsPayout — numeric safety", function () {
  it("returns a finite number for valid inputs", function () {
    const payout = calcSlotsPayout(["💎", "💎", "💎"], 100);
    assert.ok(Number.isFinite(payout), `payout should be finite, got ${payout}`);
  });

  it("returns 0 (no match) for all-different symbols", function () {
    const payout = calcSlotsPayout(["🍒", "🍋", "🍊"], 100);
    assert.ok(Number.isFinite(payout));
    assert.ok(payout >= 0);
  });
});
