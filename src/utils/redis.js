import { createClient } from "redis";
import { botLogger } from "./modernLogger.js";

let redisClient = null;

export async function getRedisClient() {
  if (redisClient) {
    if (!redisClient.isOpen) await redisClient.connect().catch(() => {});
    return redisClient;
  }

  const url = process.env.REDIS_URL || "redis://redis:6379";
  redisClient = createClient({ url });

  redisClient.on("error", (err) => {
    // Suppress spammy connection errors
    if (err.code === "ECONNREFUSED") return;
    botLogger.error({ err }, "[redis-client] error");
  });

  await redisClient.connect();
  return redisClient;
}

export async function closeRedis() {
  if (redisClient?.isOpen) {
    await redisClient.quit().catch(() => {});
  }
  redisClient = null;
}

export async function setCache(key, value, ttlSeconds = 600) {
  const client = await getRedisClient();
  if (!client?.isOpen) {
    botLogger.error({ key }, "[redis:set] client not open");
    return false;
  }
  try {
    const data = JSON.stringify(value);
    await client.set(key, data, { EX: ttlSeconds });
    return true;
  } catch (err) {
    botLogger.error({ err, key }, "[redis:set] error");
    return false;
  }
}

export async function getCache(key) {
  const client = await getRedisClient();
  if (!client?.isOpen) {
    botLogger.error({ key }, "[redis:get] client not open");
    return null;
  }
  try {
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    botLogger.error({ err, key }, "[redis:get] error");
    return null;
  }
}

export async function delCache(key) {
  const client = await getRedisClient();
  if (!client?.isOpen) {
    botLogger.error({ key }, "[redis:del] client not open");
    return false;
  }
  try {
    await client.del(key);
    return true;
  } catch (err) {
    botLogger.error({ err, key }, "[redis:del] error");
    return false;
  }
}
