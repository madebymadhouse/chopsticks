/**
 * MAP Cycle 4 — Dashboard Command Enhancement Tests
 * Tests for the enhanced /dashboard (console.js) command.
 */

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const consoleSrc = readFileSync(join(__dirname, "../../src/commands/console.js"), "utf8");

// ── Source-level structural checks ──────────────────────────────────────────

describe("MAP-C4 — /dashboard command structure", function () {
  it("exports meta with category: admin", function () {
    assert.ok(consoleSrc.includes('category: "admin"'), "meta.category must be 'admin'");
  });

  it("exports meta with deployGlobal: false (guild-only admin command)", function () {
    assert.ok(consoleSrc.includes("deployGlobal: false"), "deployGlobal must be false");
  });

  it("requires ManageGuild permission", function () {
    assert.ok(
      consoleSrc.includes("ManageGuild"),
      "dashboard must require ManageGuild permission"
    );
  });

  it("uses EmbedBuilder (rich embed response)", function () {
    assert.ok(consoleSrc.includes("EmbedBuilder"), "dashboard must use EmbedBuilder");
  });

  it("uses progressBar from embedComponents.js", function () {
    assert.ok(
      consoleSrc.includes("embedComponents.js") && consoleSrc.includes("progressBar"),
      "dashboard must import progressBar from embedComponents.js"
    );
  });

  it("token TTL is 10 minutes (600 seconds)", function () {
    assert.ok(
      consoleSrc.includes("CONSOLE_TOKEN_TTL") && consoleSrc.includes("10 * 60"),
      "token TTL must be 10 * 60 = 600 seconds"
    );
  });

  it("uses HS256 algorithm for JWT", function () {
    assert.ok(consoleSrc.includes('algorithm: "HS256"'), "JWT must use HS256 algorithm");
  });

  it("JWT payload includes jti (nonce) for single-use enforcement", function () {
    assert.ok(consoleSrc.includes("jti:"), "JWT must include jti claim for nonce/single-use");
  });

  it("JWT payload includes guildId and userId", function () {
    assert.ok(consoleSrc.includes("guildId"), "JWT must include guildId");
    assert.ok(consoleSrc.includes("userId"), "JWT must include userId");
  });

  it("reply is ephemeral (only visible to admin)", function () {
    assert.ok(consoleSrc.includes("ephemeral: true"), "reply must be ephemeral");
  });

  it("button uses ButtonStyle.Link (opens in browser)", function () {
    assert.ok(consoleSrc.includes("ButtonStyle.Link"), "must use Link button");
  });

  it("includes agent pool health check (buildHealthSnapshot)", function () {
    assert.ok(
      consoleSrc.includes("buildHealthSnapshot"),
      "dashboard must show live agent pool status"
    );
  });

  it("agent pool check is non-blocking (graceful null check)", function () {
    // global.agentManager may not be present in test env — must null-check
    assert.ok(
      consoleSrc.includes("global.agentManager") && consoleSrc.includes("if (!mgr)"),
      "agent manager access must be guarded with null check"
    );
  });

  it("shows warm-pool warning when needsWarmup is true", function () {
    assert.ok(
      consoleSrc.includes("needsWarmup") && consoleSrc.includes("warmStatus"),
      "must show warm-pool warning when pool needs warmup"
    );
  });

  it("URL includes /console-auth path", function () {
    assert.ok(consoleSrc.includes("/console-auth?token="), "URL must use /console-auth path");
  });
});

// ── Runtime import check ──────────────────────────────────────────────────────

describe("MAP-C4 — /dashboard module loads", function () {
  it("exports data (SlashCommandBuilder), execute (function), meta (object)", async function () {
    const mod = await import("../../src/commands/console.js");
    assert.ok(mod.data && typeof mod.data.toJSON === "function", "data must be SlashCommandBuilder");
    assert.ok(typeof mod.execute === "function", "execute must be a function");
    assert.ok(mod.meta && typeof mod.meta === "object", "meta must be an object");
  });

  it("command name is 'dashboard'", async function () {
    const { data } = await import("../../src/commands/console.js");
    assert.equal(data.toJSON().name, "dashboard");
  });

  it("has no required options (link-only command)", async function () {
    const { data } = await import("../../src/commands/console.js");
    const opts = data.toJSON().options ?? [];
    const required = opts.filter(o => o.required);
    assert.equal(required.length, 0, "dashboard must have no required options");
  });
});
