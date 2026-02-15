import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { parseScriptDsl } from "../../src/scripting/parser.js";
import { validateScriptDefinition } from "../../src/scripting/validator.js";

describe("Scripting parser + validator", function () {
  it("parses JSON DSL object", function () {
    const parsed = parseScriptDsl('{"message":{"content":"hello"}}');
    assert.equal(parsed.message.content, "hello");
  });

  it("rejects invalid JSON", function () {
    assert.throws(() => parseScriptDsl("{invalid"), /valid JSON/i);
  });

  it("normalizes trigger and permissions", function () {
    const normalized = validateScriptDefinition({
      trigger: { type: "schedule", value: "*/5 * * * *" },
      permissions: { mode: "everyone", roleIds: ["123", "456"] },
      message: { content: "ping {{user.name}}" }
    });
    assert.equal(normalized.trigger.type, "schedule");
    assert.equal(normalized.permissions.mode, "everyone");
    assert.deepEqual(normalized.permissions.roleIds, ["123", "456"]);
  });

  it("rejects unsafe keys", function () {
    assert.throws(
      () => validateScriptDefinition({
        message: { content: "x" },
        $where: "bad"
      }),
      /unsafe key/i
    );
  });

  it("rejects scripts with no content and no embeds", function () {
    assert.throws(
      () => validateScriptDefinition({ message: { content: "" } }),
      /content or at least one embed/i
    );
  });

  it("rejects non-http button URLs", function () {
    assert.throws(
      () =>
        validateScriptDefinition({
          message: {
            content: "ok",
            buttons: [{ label: "bad", url: "javascript:alert(1)" }]
          }
        }),
      /button\.url/i
    );
  });
});
