import { RateLimiterRedis, RateLimiterMemory } from "rate-limiter-flexible";
import { createClient } from "redis";
import { securityLogger } from "./modernLogger.js";

// Redis client for rate limiting (separate from main Redis)
let redisClient = null;
let rateLimiter = null;
let sensitiveActionLimiter = null; // module-level singleton — not per-call

async function initRateLimiter() {
  try {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = createClient({ url: redisUrl });
    
    redisClient.on("error", (err) => {
      securityLogger.error({ err }, "Rate limiter Redis error");
    });

    await redisClient.connect();

    // Configure rate limiter with Redis backend
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "rl:",
      points: 10, // Number of requests
      duration: 1, // Per second
      blockDuration: 60, // Block for 60 seconds if exceeded
      execEvenly: false,
      inmemoryBlockOnConsumed: 10,
      inmemoryBlockDuration: 60,
    });

    securityLogger.info("Rate limiter initialized with Redis backend");
    // Initialize the sensitive-action singleton alongside the main limiter
    sensitiveActionLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: "rl:sensitive:",
      points: 3,
      duration: 300,
      blockDuration: 3600,
    });
  } catch (err) {
    securityLogger.warn({ err }, "Rate limiter falling back to in-memory");
    redisClient = null;
    
    // Fallback to in-memory rate limiter
    rateLimiter = new RateLimiterMemory({
      points: 10,
      duration: 1,
      blockDuration: 60,
    });
    sensitiveActionLimiter = new RateLimiterMemory({
      keyPrefix: "rl:sensitive:",
      points: 3,
      duration: 300,
      blockDuration: 3600,
    });
  }
}

// Per-user rate limiting for commands
export async function checkCommandRateLimit(userId, commandName) {
  if (!rateLimiter) {
    await initRateLimiter();
  }

  const key = `cmd:${userId}:${commandName}`;
  
  try {
    await rateLimiter.consume(key, 1);
    return { allowed: true };
  } catch (rejRes) {
    if (rejRes instanceof Error) {
      securityLogger.error({ err: rejRes }, "Rate limiter error");
      return { allowed: true }; // Fail open on error
    }
    
    // Rate limit exceeded
    const secondsToReset = Math.round(rejRes.msBeforeNext / 1000);
    securityLogger.warn(
      { userId, commandName, secondsToReset },
      "Rate limit exceeded"
    );
    
    return {
      allowed: false,
      retryAfter: secondsToReset,
    };
  }
}

// Aggressive rate limiting for sensitive actions (login, token operations, etc.)
export async function checkSensitiveActionLimit(identifier) {
  if (!sensitiveActionLimiter) {
    await initRateLimiter();
  }

  const key = `sensitive:${identifier}`;

  try {
    await sensitiveActionLimiter.consume(key, 1);
    return { allowed: true };
  } catch (rejRes) {
    if (rejRes instanceof Error) {
      return { allowed: true }; // Fail open
    }
    
    securityLogger.error(
      { identifier, msBeforeNext: rejRes.msBeforeNext },
      "Sensitive action rate limit exceeded"
    );
    
    return {
      allowed: false,
      retryAfter: Math.round(rejRes.msBeforeNext / 1000),
    };
  }
}

// Distributed rate limiting for API endpoints (Express middleware)
export function createApiRateLimiter(options = {}) {
  let limiter = null;

  async function ensureLimiter() {
    if (limiter) return limiter;
    if (!redisClient) await initRateLimiter();

    if (redisClient) {
      limiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: options.keyPrefix || "rl:api:",
        points: options.points || 100,
        duration: options.duration || 60,
        blockDuration: options.blockDuration || 300,
      });
      return limiter;
    }

    limiter = new RateLimiterMemory({
      keyPrefix: options.keyPrefix || "rl:api:",
      points: options.points || 100,
      duration: options.duration || 60,
      blockDuration: options.blockDuration || 300,
    });
    return limiter;
  }

  return async (req, res, next) => {
    const activeLimiter = await ensureLimiter();
    const key = options.keyGenerator 
      ? options.keyGenerator(req)
      : req.ip || req.connection.remoteAddress;

    try {
      await activeLimiter.consume(key, 1);
      next();
    } catch (rejRes) {
      if (rejRes instanceof Error) {
        securityLogger.error({ err: rejRes }, "API rate limiter backend error; allowing request");
        return next();
      }
      res.status(429).json({
        error: "Too Many Requests",
        retryAfter: Math.round(rejRes.msBeforeNext / 1000),
      });
    }
  };
}

export default { checkCommandRateLimit, checkSensitiveActionLimit, createApiRateLimiter };
