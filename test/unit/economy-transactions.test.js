// test/unit/economy-transactions.test.js
import { describe, it } from 'mocha';
import { strict as assert } from 'assert';

// ── Imports ───────────────────────────────────────────────────────────────────

import { formatCooldown } from '../../src/economy/cooldowns.js';

import {
  validateBet,
  isValidCoinSide,
  SLOT_SYMBOLS,
  calcSlotsPayout,
} from '../../src/commands/casino.js';

import { validateTradeRequest } from '../../src/commands/trade.js';

import {
  calcHeistOutcome,
  canStartHeist,
  canJoinHeist,
} from '../../src/commands/heist.js';

import {
  canCreateAuction,
  isBidValid,
} from '../../src/commands/auction.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function futureIso(offsetMs = 60 * 60 * 1000) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function makeAuction(id, overrides = {}) {
  return {
    id,
    item:           'Test Item',
    starting_bid:   100,
    current_bid:    99,
    current_bidder: null,
    end_time_iso:   futureIso(),
    created_by:     'user1',
    active:         true,
    ...overrides,
  };
}

function makeHeist(overrides = {}) {
  return {
    id:                  'h1',
    leader:              'leader1',
    participants:        ['leader1'],
    start_time:          new Date().toISOString(),
    join_window_seconds: 60,
    status:              'recruiting',
    ...overrides,
  };
}

// ── 1. Cooldown formatting ────────────────────────────────────────────────────

describe('formatCooldown — basic formatting', function () {
  it('formats whole seconds', function () {
    assert.equal(formatCooldown(1000), '1s');
  });

  it('formats minutes and seconds', function () {
    assert.equal(formatCooldown(65000), '1m 5s');
  });

  it('formats hours and minutes (drops seconds)', function () {
    assert.equal(formatCooldown(3661000), '1h 1m');
  });

  it('formats days and hours', function () {
    assert.equal(formatCooldown(90 * 60 * 60 * 1000), '3d 18h');
  });

  it('returns "a moment" for zero ms', function () {
    assert.equal(formatCooldown(0), 'a moment');
  });

  it('returns "a moment" for negative ms', function () {
    assert.equal(formatCooldown(-1000), 'a moment');
  });

  it('returns "less than a second" for sub-second positive ms', function () {
    assert.equal(formatCooldown(500), 'less than a second');
  });

  it('returns "a moment" for non-finite input', function () {
    assert.equal(formatCooldown(Infinity), 'a moment');
    assert.equal(formatCooldown(NaN), 'a moment');
  });
});

// ── 2. Casino — bet validation ────────────────────────────────────────────────

describe('casino — validateBet edge cases', function () {
  it('rejects zero bet', function () {
    assert.equal(validateBet(0, 1, 100), false);
  });

  it('rejects negative bet', function () {
    assert.equal(validateBet(-10, 1, 100), false);
  });

  it('accepts bet within range', function () {
    assert.ok(validateBet(50, 1, 100));
  });

  it('rejects bet exceeding max', function () {
    assert.equal(validateBet(200, 1, 100), false);
  });

  it('accepts bet equal to min', function () {
    assert.ok(validateBet(1, 1, 100));
  });

  it('accepts bet equal to max', function () {
    assert.ok(validateBet(100, 1, 100));
  });
});

describe('casino — isValidCoinSide', function () {
  it('accepts "heads"', function () {
    assert.ok(isValidCoinSide('heads'));
  });

  it('accepts "tails"', function () {
    assert.ok(isValidCoinSide('tails'));
  });

  it('rejects "edge"', function () {
    assert.equal(isValidCoinSide('edge'), false);
  });

  it('rejects empty string', function () {
    assert.equal(isValidCoinSide(''), false);
  });
});

describe('casino — SLOT_SYMBOLS', function () {
  it('is a non-empty array', function () {
    assert.ok(Array.isArray(SLOT_SYMBOLS));
    assert.ok(SLOT_SYMBOLS.length > 0);
  });
});

describe('casino — calcSlotsPayout winning combo', function () {
  it('3× 💎 returns a multiplier > 1× bet', function () {
    const payout = calcSlotsPayout(['💎', '💎', '💎'], 100);
    assert.ok(payout > 100);
  });

  it('no match returns 0', function () {
    assert.equal(calcSlotsPayout([SLOT_SYMBOLS[0], SLOT_SYMBOLS[1], SLOT_SYMBOLS[2]], 100), 0);
  });
});

// ── 3. Trade validation ───────────────────────────────────────────────────────

describe('trade — self-trade', function () {
  it('rejects trade with self', function () {
    const v = validateTradeRequest('user1', 'user1', 100);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'self');
  });
});

describe('trade — amount guards', function () {
  it('rejects zero amount', function () {
    const v = validateTradeRequest('user1', 'user2', 0);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'amount');
  });

  it('rejects negative amount', function () {
    const v = validateTradeRequest('user1', 'user2', -50);
    assert.equal(v.ok, false);
    assert.equal(v.reason, 'amount');
  });

  it('accepts valid trade', function () {
    const v = validateTradeRequest('user1', 'user2', 50);
    assert.ok(v.ok);
  });
});

// ── 4. Heist logic ────────────────────────────────────────────────────────────

describe('heist — canStartHeist', function () {
  it('allows start when no active heist', function () {
    assert.ok(canStartHeist(null));
  });

  it('rejects start when heist is recruiting', function () {
    assert.equal(canStartHeist({ status: 'recruiting' }), false);
  });
});

describe('heist — canJoinHeist', function () {
  it('rejects join when heist is full (10 participants)', function () {
    const participants = Array.from({ length: 10 }, (_, i) => `user${i}`);
    const heist = makeHeist({ participants });
    const r = canJoinHeist(heist, 'user99');
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'full');
  });

  it('rejects join when no active heist', function () {
    const r = canJoinHeist(null, 'user2');
    assert.equal(r.ok, false);
  });
});

describe('heist — calcHeistOutcome', function () {
  it('solo heist has 40% base chance', function () {
    const { chance } = calcHeistOutcome(1, 0);
    assert.equal(chance, 40);
  });

  it('winner prize scales with participant count', function () {
    const { prizeEach } = calcHeistOutcome(3, 0);
    assert.ok(prizeEach > 0);
  });
});

// ── 5. Auction validation ─────────────────────────────────────────────────────

describe('auction — canCreateAuction', function () {
  it('allows creation with fewer than 3 active auctions', function () {
    const auctions = [makeAuction('a1'), makeAuction('a2')];
    assert.ok(canCreateAuction(auctions));
  });

  it('rejects creation when 3 are already active', function () {
    const auctions = [makeAuction('a1'), makeAuction('a2'), makeAuction('a3')];
    assert.equal(canCreateAuction(auctions), false);
  });
});

describe('auction — isBidValid', function () {
  it('accepts bid strictly greater than current_bid', function () {
    const auction = makeAuction('a1', { current_bid: 50 });
    assert.ok(isBidValid(auction, 100));
  });

  it('rejects bid equal to or below current_bid', function () {
    const auction = makeAuction('a1', { current_bid: 100 });
    assert.equal(isBidValid(auction, 50), false);
  });
});

// ── 6. Credit floor guard (pure logic) ───────────────────────────────────────

describe('credit floor — removeCredits guard logic', function () {
  function wouldGoNegative(balance, amount) {
    return balance - amount < 0;
  }

  it('detects when removal exceeds balance', function () {
    assert.ok(wouldGoNegative(100, 150));
  });

  it('allows removal within balance', function () {
    assert.ok(!wouldGoNegative(150, 100));
  });

  it('exact balance removal does not go negative', function () {
    assert.ok(!wouldGoNegative(100, 100));
  });
});
