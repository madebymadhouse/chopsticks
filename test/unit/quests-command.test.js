import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { data as questsCommand, handleButton } from "../../src/commands/quests.js";

describe("Quests command definition", function () {
  it("exposes /quests with no options", function () {
    const json = questsCommand.toJSON();
    assert.equal(json.name, "quests");
    const options = json.options || [];
    assert.equal(options.length, 0);
  });

  it("exports button handler", function () {
    assert.equal(typeof handleButton, "function");
  });
});

