/**
 * src/events/eventBus.js
 * Lightweight in-process event emitter — Phase G Cycle U1
 *
 * Events fired:
 *   USER_LEVELED_UP     { userId, guildId, fromLevel, toLevel, xpGained }
 *   CRATE_OPENED        { userId, guildId, crateType, item }
 *   FISH_CAUGHT         { userId, guildId, item, rarity }
 *   ORE_MINED           { userId, guildId, ore, rarity }
 *   BATTLE_WON          { winnerId, loserId, guildId, wager, xpGained }
 *   DAILY_CLAIMED       { userId, guildId, credits, streak }
 *   ITEM_PURCHASED      { userId, guildId, itemId, price }
 *   PRESTIGE_ACHIEVED   { userId, guildId, prestige }
 *   ACHIEVEMENT_UNLOCKED { userId, guildId, achievementId }
 *   MEMBER_JOINED       { userId, guildId, memberCount }
 */

import { EventEmitter } from "node:events";

class GameEventBus extends EventEmitter {
  /** Emit a typed game event safely */
  fire(eventName, payload = {}) {
    try {
      this.emit(eventName, { ...payload, _ts: Date.now(), _event: eventName });
    } catch {
      // Never let event bus crash the bot
    }
  }
}

export const eventBus = new GameEventBus();
eventBus.setMaxListeners(50);

export const Events = Object.freeze({
  USER_LEVELED_UP:      "USER_LEVELED_UP",
  CRATE_OPENED:         "CRATE_OPENED",
  FISH_CAUGHT:          "FISH_CAUGHT",
  ORE_MINED:            "ORE_MINED",
  BATTLE_WON:           "BATTLE_WON",
  DAILY_CLAIMED:        "DAILY_CLAIMED",
  ITEM_PURCHASED:       "ITEM_PURCHASED",
  PRESTIGE_ACHIEVED:    "PRESTIGE_ACHIEVED",
  ACHIEVEMENT_UNLOCKED: "ACHIEVEMENT_UNLOCKED",
  MEMBER_JOINED:        "MEMBER_JOINED",
});
