import { describe, it } from "mocha";
import { strict as assert } from "assert";
import {
  normalizePrefixValue,
  parsePrefixArgs,
  resolveAliasedCommand,
  suggestCommandNames
} from "../../src/prefix/hardening.js";

describe("Prefix hardening", function () {
  it("parses quoted prefix args", function () {
    const args = parsePrefixArgs('fun hype-burst "Alpha Team" --intensity=4');
    assert.deepEqual(args, ["fun", "hype-burst", "Alpha Team", "--intensity=4"]);
  });

  it("rejects unsafe prefix values", function () {
    const a = normalizePrefixValue("/");
    const b = normalizePrefixValue("@everyone");
    const c = normalizePrefixValue("abcde");
    assert.equal(a.ok, false);
    assert.equal(b.ok, false);
    assert.equal(c.ok, false);
  });

  it("resolves alias chains", function () {
    const resolved = resolveAliasedCommand("p", { p: "play", play: "music" });
    assert.equal(resolved.ok, true);
    assert.equal(resolved.commandName, "music");
  });

  it("detects alias cycles", function () {
    const resolved = resolveAliasedCommand("a", { a: "b", b: "a" });
    assert.equal(resolved.ok, false);
    assert.equal(resolved.error, "cycle");
  });

  it("suggests close command names", function () {
    const hits = suggestCommandNames("musc", ["music", "mute", "fun"], 2);
    assert.ok(hits.includes("music"));
  });
});
