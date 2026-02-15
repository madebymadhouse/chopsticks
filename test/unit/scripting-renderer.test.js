import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { renderScriptDefinition } from "../../src/scripting/renderer.js";

describe("Scripting renderer", function () {
  it("renders built-in variables", function () {
    const rendered = renderScriptDefinition(
      {
        message: {
          content: "Hi {{user.name}} from {{guild.name}}"
        }
      },
      {
        user: { id: "1", username: "wok" },
        guild: { id: "2", name: "Kitchen" },
        channel: { id: "3", name: "chat" }
      }
    );
    assert.equal(rendered.payload.content, "Hi wok from Kitchen");
  });

  it("renders embeds and link buttons", function () {
    const rendered = renderScriptDefinition(
      {
        message: {
          content: "Open this",
          embeds: [{ title: "Hello {{user.name}}", description: "in {{channel.name}}" }],
          buttons: [{ label: "Docs", url: "https://example.com/{{guild.id}}" }]
        }
      },
      {
        user: { id: "1", username: "wok" },
        guild: { id: "22", name: "Kitchen" },
        channel: { id: "3", name: "music" }
      }
    );

    assert.equal(rendered.payload.embeds[0].title, "Hello wok");
    assert.equal(rendered.payload.embeds[0].description, "in music");
    assert.equal(rendered.payload.components[0].components[0].url, "https://example.com/22");
  });

  it("strips malformed token expressions (injection safety)", function () {
    const rendered = renderScriptDefinition(
      {
        message: {
          content: "A {{user.name}} B {{(globalThis.process.env)}} C {{constructor.prototype}}"
        }
      },
      {
        user: { id: "1", username: "wok" },
        guild: { id: "2", name: "Kitchen" },
        channel: { id: "3", name: "chat" }
      }
    );
    assert.equal(rendered.payload.content, "A wok B  C ");
  });
});

