import { describe, it } from "mocha";
import { strict as assert } from "assert";
import profileCommand from "../../src/commands/profile.js";

describe("Profile command definition", function () {
  it("exposes /profile with privacy options", function () {
    const json = profileCommand.data.toJSON();
    assert.equal(json.name, "profile");

    const optionNames = (json.options || []).map(o => o.name);
    assert.ok(optionNames.includes("user"));
    assert.ok(optionNames.includes("private"));
    assert.ok(optionNames.includes("privacy_preset"));
    assert.ok(optionNames.includes("show_progress"));
    assert.ok(optionNames.includes("show_economy"));
    assert.ok(optionNames.includes("show_inventory"));
    assert.ok(optionNames.includes("show_usage"));
    assert.ok(optionNames.includes("show_activity"));
  });
});

