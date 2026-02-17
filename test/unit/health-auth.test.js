import assert from "node:assert/strict";
import { isHealthAuthorized, readHealthSecurityConfig } from "../../src/utils/healthServer.js";

function reqWithAuthHeader(value) {
  return { headers: { authorization: value } };
}

describe("Health Server Auth Helpers", () => {
  it("reads debug default off in production", () => {
    const cfg = readHealthSecurityConfig({ NODE_ENV: "production" });
    assert.equal(cfg.debugEnabled, false);
  });

  it("reads debug default on in development", () => {
    const cfg = readHealthSecurityConfig({ NODE_ENV: "development" });
    assert.equal(cfg.debugEnabled, true);
  });

  it("authorizes when token is empty", () => {
    assert.equal(isHealthAuthorized(reqWithAuthHeader(""), ""), true);
    assert.equal(isHealthAuthorized(reqWithAuthHeader("Bearer x"), ""), true);
  });

  it("authorizes bearer token match", () => {
    assert.equal(isHealthAuthorized(reqWithAuthHeader("Bearer secret"), "secret"), true);
    assert.equal(isHealthAuthorized(reqWithAuthHeader("bearer secret"), "secret"), true);
  });

  it("rejects bearer token mismatch", () => {
    assert.equal(isHealthAuthorized(reqWithAuthHeader("Bearer wrong"), "secret"), false);
  });

  it("accepts x-metrics-token header", () => {
    const req = { headers: { "x-metrics-token": "secret" } };
    assert.equal(isHealthAuthorized(req, "secret"), true);
  });
});

