import { cacheSetNx } from "./cache.js";

const memory = new Map();

function nowMs() {
  return Date.now();
}

function cleanupMemory() {
  const n = nowMs();
  for (const [key, expiresAt] of memory.entries()) {
    if (expiresAt <= n) memory.delete(key);
  }
}

export async function claimIdempotencyKey(rawKey, ttlSec = 180) {
  const key = String(rawKey || "").trim();
  if (!key) return false;

  const ttl = Math.max(1, Math.trunc(Number(ttlSec) || 180));
  const claimed = await cacheSetNx(`idem:${key}`, { at: nowMs() }, ttl);
  if (claimed === true) return true;
  if (claimed === false) return false;

  // Redis unavailable: safe in-process fallback
  cleanupMemory();
  if (memory.has(key)) return false;
  memory.set(key, nowMs() + ttl * 1000);
  return true;
}

