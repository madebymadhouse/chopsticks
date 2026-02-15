import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { metricsHandler, healthHandler, register } from "../../src/utils/metrics.js";

function makeRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    ended: false,
    set(key, value) {
      this.headers[String(key).toLowerCase()] = value;
      return this;
    },
    end(payload = "") {
      this.body = payload;
      this.ended = true;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.ended = true;
      return this;
    }
  };
}

describe("Observability foundations", function () {
  it("metrics handler returns Prometheus output", async function () {
    const res = makeRes();
    await metricsHandler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.ended, true);
    assert.equal(typeof res.body, "string");
    assert.ok(res.body.includes("chopsticks_"));
    assert.ok(res.headers["content-type"]);
  });

  it("metrics handler fails closed without crashing", async function () {
    const original = register.metrics;
    try {
      register.metrics = async () => {
        throw new Error("forced-metrics-failure");
      };

      const res = makeRes();
      await metricsHandler({}, res);

      assert.equal(res.statusCode, 500);
      assert.equal(res.ended, true);
    } finally {
      register.metrics = original;
    }
  });

  it("health handler returns structured payload", function () {
    const res = makeRes();
    healthHandler({}, res);
    assert.equal(res.statusCode, 200);
    assert.equal(typeof res.body, "object");
    assert.equal(res.body.status, "healthy");
    assert.ok(typeof res.body.uptime === "number");
    assert.ok(typeof res.body.timestamp === "string");
  });
});
