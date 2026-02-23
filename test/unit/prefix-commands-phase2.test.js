import { describe, it } from "mocha";
import { strict as assert } from "assert";

import utilityCommands from "../../src/prefix/commands/utility.js";
import funCommands from "../../src/prefix/commands/fun.js";
import infoCommands from "../../src/prefix/commands/info.js";
import modCommands from "../../src/prefix/commands/mod.js";
import serverCommands from "../../src/prefix/commands/server.js";
import metaCommands from "../../src/prefix/commands/meta.js";
import { parseIntSafe } from "../../src/prefix/helpers.js";
import { parsePrefixArgs } from "../../src/prefix/hardening.js";

// ─── 1. Registry structure ────────────────────────────────────────────────────

describe("prefix command registry — utility.js", () => {
  it("is an array", () => assert.ok(Array.isArray(utilityCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of utilityCommands) {
      assert.equal(typeof cmd.name, "string", `${cmd.name} name`);
      assert.equal(typeof cmd.execute, "function", `${cmd.name} execute`);
    }
  });
  it("contains expected command names", () => {
    const names = utilityCommands.map(c => c.name);
    for (const n of ["ping", "uptime", "help", "echo", "choose", "invite"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

describe("prefix command registry — fun.js", () => {
  it("is an array", () => assert.ok(Array.isArray(funCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of funCommands) {
      assert.equal(typeof cmd.name, "string");
      assert.equal(typeof cmd.execute, "function");
    }
  });
  it("contains expected command names", () => {
    const names = funCommands.map(c => c.name);
    for (const n of ["roll", "coinflip", "8ball", "fun"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

describe("prefix command registry — info.js", () => {
  it("is an array", () => assert.ok(Array.isArray(infoCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of infoCommands) {
      assert.equal(typeof cmd.name, "string");
      assert.equal(typeof cmd.execute, "function");
    }
  });
  it("contains expected command names", () => {
    const names = infoCommands.map(c => c.name);
    for (const n of ["serverinfo", "userinfo", "avatar", "roleinfo", "botinfo"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

describe("prefix command registry — mod.js", () => {
  it("is an array", () => assert.ok(Array.isArray(modCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of modCommands) {
      assert.equal(typeof cmd.name, "string");
      assert.equal(typeof cmd.execute, "function");
    }
  });
  it("contains expected command names", () => {
    const names = modCommands.map(c => c.name);
    for (const n of ["purge", "slowmode", "kick", "ban", "unban", "timeout", "warn", "warnings", "clearwarns", "lock", "unlock", "nick", "softban", "role"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

describe("prefix command registry — server.js", () => {
  it("is an array", () => assert.ok(Array.isArray(serverCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of serverCommands) {
      assert.equal(typeof cmd.name, "string");
      assert.equal(typeof cmd.execute, "function");
    }
  });
  it("contains expected command names", () => {
    const names = serverCommands.map(c => c.name);
    for (const n of ["poll", "giveaway", "remind", "welcome", "autorole", "prefix"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

describe("prefix command registry — meta.js", () => {
  it("is an array", () => assert.ok(Array.isArray(metaCommands)));
  it("each entry has name (string) and execute (function)", () => {
    for (const cmd of metaCommands) {
      assert.equal(typeof cmd.name, "string");
      assert.equal(typeof cmd.execute, "function");
    }
  });
  it("contains expected command names", () => {
    const names = metaCommands.map(c => c.name);
    for (const n of ["aliases", "agents"]) {
      assert.ok(names.includes(n), `missing ${n}`);
    }
  });
});

// ─── 2. Rate limit metadata ────────────────────────────────────────────────────

describe("prefix commands — rateLimit metadata", () => {
  const allModules = [
    ["utility", utilityCommands],
    ["fun", funCommands],
    ["info", infoCommands],
    ["mod", modCommands],
    ["server", serverCommands],
    ["meta", metaCommands],
  ];
  for (const [label, cmds] of allModules) {
    it(`every ${label} command has a positive rateLimit`, () => {
      for (const cmd of cmds) {
        assert.ok(
          typeof cmd.rateLimit === "number" && cmd.rateLimit > 0,
          `${cmd.name} missing rateLimit`
        );
      }
    });
  }
});

// ─── 3. Permission guards on mod commands ─────────────────────────────────────

describe("mod commands — userPerms guards", () => {
  const MOD_COMMANDS = ["kick", "ban", "unban", "timeout", "warn", "warnings", "clearwarns", "lock", "unlock", "nick", "softban"];
  for (const name of MOD_COMMANDS) {
    it(`${name} has userPerms set`, () => {
      const cmd = modCommands.find(c => c.name === name);
      assert.ok(cmd?.userPerms?.length > 0, `${name} missing userPerms`);
    });
  }
});

// ─── 4. Guild-only guards on mod commands ─────────────────────────────────────

describe("mod commands — guildOnly guard", () => {
  it("all mod commands have guildOnly: true", () => {
    for (const cmd of modCommands) {
      assert.equal(cmd.guildOnly, true, `mod command '${cmd.name}' should be guildOnly`);
    }
  });
});

// ─── 5. parseIntSafe helper ───────────────────────────────────────────────────

describe("parseIntSafe", () => {
  it("returns integer for valid in-range value", () => assert.equal(parseIntSafe("5", 1, 10), 5));
  it("returns null for value below min", () => assert.equal(parseIntSafe("0", 1, 10), null));
  it("returns null for value above max", () => assert.equal(parseIntSafe("11", 1, 10), null));
  it("returns null for non-numeric string", () => assert.equal(parseIntSafe("abc", 1, 10), null));
  it("truncates float to integer", () => assert.equal(parseIntSafe("5.9", 1, 10), 5));
  it("returns null for NaN string", () => assert.equal(parseIntSafe("NaN", 1, 10), null));
});

// ─── 6. parsePrefixArgs edge cases ────────────────────────────────────────────

describe("parsePrefixArgs — additional edge cases", () => {
  it("splits 'ban @user some reason here' into 5 elements", () => {
    const result = parsePrefixArgs("ban @user some reason here");
    assert.equal(result.length, 5);
  });
  it("returns [] for empty string", () => {
    assert.deepEqual(parsePrefixArgs(""), []);
  });
  it("returns [] for whitespace-only string", () => {
    assert.deepEqual(parsePrefixArgs("  "), []);
  });
});

// ─── 7. Descriptions — only modules that have them ────────────────────────────

describe("prefix commands — descriptions (utility + fun)", () => {
  // utility: ping, uptime, help, echo, choose have descriptions; invite does not
  const utilityWithDesc = utilityCommands.filter(c => c.name !== "invite");
  it("utility commands (except invite) have a non-empty description", () => {
    for (const cmd of utilityWithDesc) {
      assert.ok(
        typeof cmd.description === "string" && cmd.description.length > 0,
        `${cmd.name} missing description`
      );
    }
  });

  it("fun commands all have a non-empty description", () => {
    for (const cmd of funCommands) {
      assert.ok(
        typeof cmd.description === "string" && cmd.description.length > 0,
        `${cmd.name} missing description`
      );
    }
  });
});
