// test/unit/ha10-dashboard-hardening.test.js
// HA-10: Dashboard hardening audit — command palette XSS, SVG logo safety,
//        CSP/cookie flags, session security

import { describe, it } from "mocha";
import { strict as assert } from "assert";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function src(relPath) {
  return readFileSync(resolve(__dirname, `../../${relPath}`), "utf8");
}

// ── Command palette — XSS prevention ─────────────────────────────────────────

describe("HA-10: Dashboard — command palette XSS prevention", function () {
  it("dashboard.js uses esc() for cmd-input query interpolation", function () {
    const js = src("src/dashboard/public/js/dashboard.js");
    // No results message interpolates the user query — must use esc()
    assert.ok(
      /esc\(query\)/.test(js) || /esc\(\s*query\s*\)/.test(js),
      "cmd-palette no-results message does not escape user query"
    );
  });

  it("dashboard.js uses esc() for command label interpolation in palette results", function () {
    const js = src("src/dashboard/public/js/dashboard.js");
    // rendered command labels/subs in innerHTML must use esc()
    assert.ok(
      js.includes("esc(c.label)") || js.includes("esc(c.sub)"),
      "command palette results do not escape label/sub with esc()"
    );
  });

  it("dashboard.js does not use innerHTML with raw (unescaped) user input", function () {
    const js = src("src/dashboard/public/js/dashboard.js");
    // Detect dangerous patterns: innerHTML = `...${someRawVar}...` without esc()
    // A raw input.value interpolation would be: innerHTML = `...${input.value}...`
    const dangerousPattern = /innerHTML\s*=\s*`[^`]*\$\{input\.value[^}]*\}/;
    assert.ok(
      !dangerousPattern.test(js),
      "dashboard.js uses raw input.value in innerHTML"
    );
  });

  it("esc() function is defined and escapes HTML special chars", function () {
    const js = src("src/dashboard/public/js/dashboard.js");
    assert.ok(
      js.includes("function esc") || js.includes("const esc"),
      "esc() function not found in dashboard.js"
    );
    // Should escape at least & and <
    assert.ok(
      js.includes("&amp;") || js.includes("replace") || js.includes("escape"),
      "esc() does not appear to perform HTML escaping"
    );
  });

  it("data-page attribute in palette results uses esc() to prevent attribute injection", function () {
    const js = src("src/dashboard/public/js/dashboard.js");
    assert.ok(
      js.includes('esc(c.key)') || js.includes("data-page=\"${esc("),
      "data-page attribute in palette results is not escaped"
    );
  });
});

// ── SVG logo in guild.html — static content (no injection vectors) ───────────

describe("HA-10: Dashboard — SVG logo is static (no dynamic user content)", function () {
  it("guild.html SVG logo uses only hardcoded coordinates and colors", function () {
    const html = src("src/dashboard/public/guild.html");
    // Extract the SVG logo blocks
    const svgMatches = html.match(/<svg[^>]*>[\s\S]*?<\/svg>/g) || [];
    // None of the SVG blocks should contain template literals or script tags
    for (const svg of svgMatches) {
      assert.ok(
        !svg.includes("<script"),
        "SVG block contains <script> tag"
      );
      assert.ok(
        !svg.includes("${"),
        "SVG block contains template literal interpolation"
      );
    }
  });

  it("guild.html has at least one inline SVG (chopsticks logo redesign)", function () {
    const html = src("src/dashboard/public/guild.html");
    assert.ok(html.includes("<svg"), "guild.html missing inline SVG logo");
  });
});

// ── Session security — cookie flags ──────────────────────────────────────────

describe("HA-10: Dashboard server — session cookie security flags", function () {
  it("server.js sets httpOnly: true on session cookie", function () {
    const code = src("src/dashboard/server.js");
    assert.ok(code.includes("httpOnly: true"), "session cookie missing httpOnly: true");
  });

  it("server.js sets sameSite: 'lax' or 'strict' on session cookie", function () {
    const code = src("src/dashboard/server.js");
    assert.ok(
      code.includes("sameSite") && (code.includes("lax") || code.includes("strict")),
      "session cookie missing sameSite flag"
    );
  });

  it("server.js uses CSRF protection token", function () {
    const code = src("src/dashboard/server.js");
    assert.ok(
      code.includes("csrf") || code.includes("CSRF") || code.includes("csrfToken"),
      "server.js has no CSRF protection"
    );
  });
});

// ── TRADEMARKS.md — brand name fix ───────────────────────────────────────────

describe("HA-10: TRADEMARKS.md — brand name consistency", function () {
  it("TRADEMARKS.md uses 'Mad House' (not 'Mad House')", function () {
    const tm = src("TRADEMARKS.md");
    assert.ok(
      !tm.includes("Mad House"),
      "TRADEMARKS.md still has old 'Mad House' brand name"
    );
    assert.ok(
      tm.includes("Mad House"),
      "TRADEMARKS.md does not contain 'Mad House'"
    );
  });
});
