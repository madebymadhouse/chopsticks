import { describe, it } from "mocha";
import assert from "assert";
import { Colors, makeTypedEmbed } from "../../src/utils/discordOutput.js";

describe("UI Color System", () => {
  it("Colors.Success is green", () => assert.strictEqual(Colors.Success, 0x57F287));
  it("Colors.Error is red", () => assert.strictEqual(Colors.Error, 0xED4245));
  it("Colors.Info is blurple", () => assert.strictEqual(Colors.Info, 0x5865F2));
  it("Colors.Music is Spotify green", () => assert.strictEqual(Colors.Music, 0x1DB954));
  it("makeTypedEmbed success uses Success color", () => {
    const e = makeTypedEmbed("success", "Title", "Desc");
    assert.strictEqual(e.data.color, Colors.Success);
  });
  it("makeTypedEmbed error uses Error color", () => {
    const e = makeTypedEmbed("error", "Title", "Desc");
    assert.strictEqual(e.data.color, Colors.Error);
  });
  it("makeTypedEmbed unknown type uses Info color", () => {
    const e = makeTypedEmbed("unknown", "T", "D");
    assert.strictEqual(e.data.color, Colors.Info);
  });
});
