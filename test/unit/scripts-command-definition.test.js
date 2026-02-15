import { describe, it } from "mocha";
import { strict as assert } from "assert";
import scriptsCommand from "../../src/commands/scripts.js";

describe("Scripts command definition", function () {
  it("exposes required subcommands", function () {
    const json = scriptsCommand.data.toJSON();
    const names = new Set((json.options || []).map(o => o.name));
    assert.ok(names.has("create"));
    assert.ok(names.has("list"));
    assert.ok(names.has("test"));
    assert.ok(names.has("run"));
  });
});

