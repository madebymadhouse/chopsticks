// src/economy/cooldowns.js
// Cooldown management using Redis

import { getCache, setCache, setCacheNX } from "../utils/redis.js";

const COOLDOWNS = {
  daily: 24 * 60 * 60 * 1000, // 24 hours
  work: 30 * 60 * 1000,       // 30 minutes
  gather: 5 * 60 * 1000,       // 5 minutes
  rob: 60 * 60 * 1000,         // 1 hour
  battle: 10 * 60 * 1000       // 10 minutes
};

export async function getCooldown(userId, command) {
  const key = `cooldown:${userId}:${command}`;
  const data = await getCache(key);
  
  if (!data) return { ok: true, remaining: 0 };
  
  const remaining = data.expiresAt - Date.now();
  if (remaining <= 0) return { ok: true, remaining: 0 };
  
  return { ok: false, remaining };
}

export async function setCooldown(userId, command, durationMs = null) {
  const duration = durationMs ?? COOLDOWNS[command] ?? 60000;
  const expiresAt = Date.now() + duration;
  const key = `cooldown:${userId}:${command}`;
  
  await setCache(key, { expiresAt }, Math.ceil(duration / 1000));
  return { ok: true, expiresAt };
}

export function formatCooldown(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "a moment";
  if (ms < 1000) return "less than a second";
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Atomically try to start a cooldown using Redis SET NX EX.
 * Returns { ok: true } if the cooldown was set (user can proceed),
 * or { ok: false, remaining } if a cooldown was already active.
 *
 * This replaces the non-atomic getCooldown → work → setCooldown pattern
 * and prevents double-reward races when two requests arrive simultaneously.
 */
export async function atomicCooldown(userId, command, durationMs = null) {
  const duration = durationMs ?? COOLDOWNS[command] ?? 60000;
  const ttlSeconds = Math.ceil(duration / 1000);
  const expiresAt = Date.now() + duration;
  const key = `cooldown:${userId}:${command}`;

  // Check for an existing cooldown first (to return remaining time on failure)
  const existing = await getCache(key);
  if (existing) {
    const remaining = existing.expiresAt - Date.now();
    if (remaining > 0) return { ok: false, remaining };
  }

  // Atomically set the cooldown — only succeeds if key doesn't exist
  const acquired = await setCacheNX(key, { expiresAt }, ttlSeconds);
  if (!acquired) {
    // Another request beat us — fetch the now-set key for remaining time
    const fresh = await getCache(key);
    const remaining = fresh ? Math.max(0, fresh.expiresAt - Date.now()) : duration;
    return { ok: false, remaining };
  }

  return { ok: true, expiresAt };
}
