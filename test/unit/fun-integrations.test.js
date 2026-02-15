import { describe, it } from "mocha";
import { strict as assert } from "assert";
import {
  DEFAULT_GUILD_FUN_CONFIG,
  formatGuildFunConfig,
  normalizeGuildFunConfig
} from "../../src/fun/integrations.js";

describe("Guild fun integration config", function () {
  it("applies default config", function () {
    const out = normalizeGuildFunConfig(null);
    assert.deepEqual(out, DEFAULT_GUILD_FUN_CONFIG);
  });

  it("normalizes partial patches", function () {
    const out = normalizeGuildFunConfig({
      enabled: false,
      mode: "creative",
      intensity: 10,
      features: { welcome: false, work: true }
    });

    assert.equal(out.enabled, false);
    assert.equal(out.mode, "creative");
    assert.equal(out.intensity, 5);
    assert.equal(out.features.welcome, false);
    assert.equal(out.features.giveaway, true);
    assert.equal(out.features.daily, true);
    assert.equal(out.features.work, true);
  });

  it("formats config summary", function () {
    const text = formatGuildFunConfig(DEFAULT_GUILD_FUN_CONFIG);
    assert.ok(text.includes("enabled=true"));
    assert.ok(text.includes("mode=clean"));
    assert.ok(text.includes("intensity=3"));
    assert.ok(text.includes("welcome=true"));
  });
});
