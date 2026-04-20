import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

// ─── Inline the detectBaseUrl and deriveJwtSecret logic for unit testing ───
// (mirrors src/commands/console.js — keeps tests independent of side effects)

function detectBaseUrl(env = {}) {
  const explicit = String(env.DASHBOARD_BASE_URL || "").replace(/\/+$/g, "");
  if (explicit) return explicit;
  if (env.RAILWAY_STATIC_URL) return `https://${env.RAILWAY_STATIC_URL}`;
  if (env.RENDER_EXTERNAL_URL) return env.RENDER_EXTERNAL_URL.replace(/\/+$/g, "");
  if (env.FLY_APP_NAME) return `https://${env.FLY_APP_NAME}.fly.dev`;
  if (env.HEROKU_APP_NAME) return `https://${env.HEROKU_APP_NAME}.herokuapp.com`;
  if (env.KOYEB_PUBLIC_DOMAIN) return `https://${env.KOYEB_PUBLIC_DOMAIN}`;
  if (env.PUBLIC_URL) return String(env.PUBLIC_URL).replace(/\/+$/g, "");
  const port = env.DASHBOARD_PORT || 8788;
  return `http://localhost:${port}`;
}

function deriveJwtSecret(env = {}) {
  const explicit = String(env.DASHBOARD_SECRET || "").trim();
  if (explicit) return explicit;
  const botToken = String(env.DISCORD_TOKEN || "").trim();
  if (botToken) {
    return createHash("sha256").update(botToken + "chopsticks-console-v1").digest("hex").slice(0, 32);
  }
  return null; // signals error
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Console URL auto-detection", () => {
  it("uses explicit DASHBOARD_BASE_URL when set", () => {
    const url = detectBaseUrl({ DASHBOARD_BASE_URL: "https://my-bot.example.com/" });
    assert.equal(url, "https://my-bot.example.com");
  });

  it("strips trailing slash from explicit URL", () => {
    const url = detectBaseUrl({ DASHBOARD_BASE_URL: "https://my-bot.example.com///" });
    assert.equal(url, "https://my-bot.example.com");
  });

  it("detects Railway", () => {
    const url = detectBaseUrl({ RAILWAY_STATIC_URL: "chopsticks.up.railway.app" });
    assert.equal(url, "https://chopsticks.up.railway.app");
  });

  it("detects Render", () => {
    const url = detectBaseUrl({ RENDER_EXTERNAL_URL: "https://chopsticks.onrender.com/" });
    assert.equal(url, "https://chopsticks.onrender.com");
  });

  it("detects Fly.io", () => {
    const url = detectBaseUrl({ FLY_APP_NAME: "chopsticks-bot" });
    assert.equal(url, "https://chopsticks-bot.fly.dev");
  });

  it("detects Heroku", () => {
    const url = detectBaseUrl({ HEROKU_APP_NAME: "my-chopsticks" });
    assert.equal(url, "https://my-chopsticks.herokuapp.com");
  });

  it("detects Koyeb", () => {
    const url = detectBaseUrl({ KOYEB_PUBLIC_DOMAIN: "chopsticks.koyeb.app" });
    assert.equal(url, "https://chopsticks.koyeb.app");
  });

  it("detects generic PUBLIC_URL", () => {
    const url = detectBaseUrl({ PUBLIC_URL: "https://bot.madebymadhouse.org/" });
    assert.equal(url, "https://bot.madebymadhouse.org");
  });

  it("falls back to localhost with default port", () => {
    const url = detectBaseUrl({});
    assert.equal(url, "http://localhost:8788");
  });

  it("falls back to localhost with custom DASHBOARD_PORT", () => {
    const url = detectBaseUrl({ DASHBOARD_PORT: "9000" });
    assert.equal(url, "http://localhost:9000");
  });

  it("explicit DASHBOARD_BASE_URL takes priority over platform vars", () => {
    const url = detectBaseUrl({
      DASHBOARD_BASE_URL: "https://custom.example.com",
      RAILWAY_STATIC_URL: "should-be-ignored.railway.app",
      FLY_APP_NAME: "also-ignored",
    });
    assert.equal(url, "https://custom.example.com");
  });
});

describe("Console JWT secret derivation", () => {
  it("uses explicit DASHBOARD_SECRET when set", () => {
    const secret = deriveJwtSecret({ DASHBOARD_SECRET: "my-explicit-secret" });
    assert.equal(secret, "my-explicit-secret");
  });

  it("derives stable secret from DISCORD_TOKEN", () => {
    const token = "Bot.XXXXXXXXXXXXXXXX";
    const s1 = deriveJwtSecret({ DISCORD_TOKEN: token });
    const s2 = deriveJwtSecret({ DISCORD_TOKEN: token });
    assert.equal(s1, s2, "derived secret must be stable");
    assert.equal(typeof s1, "string");
    assert.equal(s1.length, 32, "should be 32 hex chars");
  });

  it("different tokens produce different secrets", () => {
    const s1 = deriveJwtSecret({ DISCORD_TOKEN: "token-A" });
    const s2 = deriveJwtSecret({ DISCORD_TOKEN: "token-B" });
    assert.notEqual(s1, s2);
  });

  it("DASHBOARD_SECRET takes priority over DISCORD_TOKEN derivation", () => {
    const secret = deriveJwtSecret({ DASHBOARD_SECRET: "explicit", DISCORD_TOKEN: "ignored" });
    assert.equal(secret, "explicit");
  });

  it("returns null when no token or secret available", () => {
    const secret = deriveJwtSecret({});
    assert.equal(secret, null);
  });
});
