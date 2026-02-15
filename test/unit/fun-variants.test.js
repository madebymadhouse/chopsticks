import { describe, it } from "mocha";
import { strict as assert } from "assert";
import {
  FUN_VARIANT_COUNT,
  findVariants,
  getVariantById,
  listVariantStats,
  randomVariantId,
  renderFunVariant
} from "../../src/fun/variants.js";

describe("Fun variants", function () {
  it("ships at least 200 variants", function () {
    const stats = listVariantStats();
    assert.ok(FUN_VARIANT_COUNT >= 200);
    assert.ok(stats.total >= 200);
    assert.equal(stats.total, FUN_VARIANT_COUNT);
  });

  it("can search by query", function () {
    const hits = findVariants("hype", 10);
    assert.ok(hits.length > 0);
    assert.ok(hits.some(v => v.id.includes("hype")));
  });

  it("renders a concrete variant", function () {
    const output = renderFunVariant({
      variantId: "hype-burst",
      actorTag: "tester",
      target: "crew",
      intensity: 4
    });
    assert.equal(output.ok, true);
    assert.equal(output.variant.id, "hype-burst");
    assert.ok(output.text.includes("intensity"));
  });

  it("random variant id resolves", function () {
    const id = randomVariantId();
    assert.ok(id);
    assert.ok(getVariantById(id));
  });
});
