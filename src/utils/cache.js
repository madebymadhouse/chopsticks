import { createClient } from "redis";

let client = null;
let connecting = null;

async function getClient() {
  if (client) return client;
  if (connecting) return connecting;

  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL missing");

  connecting = (async () => {
    const c = createClient({ url });
    c.on("error", () => {});
    await c.connect();
    client = c;
    return client;
  })();

  return connecting;
}

export async function cacheGet(key) {
  try {
    const c = await getClient();
    const raw = await c.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSec) {
  try {
    const c = await getClient();
    const payload = JSON.stringify(value);
    if (Number.isFinite(ttlSec) && ttlSec > 0) {
      await c.set(key, payload, { EX: Math.trunc(ttlSec) });
    } else {
      await c.set(key, payload);
    }
  } catch {}
}

export async function cacheIncr(key, ttlSec) {
  try {
    const c = await getClient();
    const count = await c.incr(key);
    if (count === 1 && Number.isFinite(ttlSec) && ttlSec > 0) {
      await c.expire(key, Math.trunc(ttlSec));
    }
    return count;
  } catch {
    return null;
  }
}

export async function cacheSetNx(key, value, ttlSec) {
  try {
    const c = await getClient();
    const payload = JSON.stringify(value);
    const opts = {};
    if (Number.isFinite(ttlSec) && ttlSec > 0) {
      opts.EX = Math.trunc(ttlSec);
    }
    const result = await c.set(key, payload, { NX: true, ...opts });
    return result === "OK";
  } catch {
    return null;
  }
}
