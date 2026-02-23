import crypto from "node:crypto";
import { execFile } from "node:child_process";

function execFileBuffer(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { ...opts, encoding: null, maxBuffer: 20 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        const msg = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : String(stderr || "");
        const e = new Error(msg || err.message);
        e.cause = err;
        reject(e);
        return;
      }
      resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(String(stdout || ""), "utf8"));
    });
  });
}

function clampText(s, n) {
  const t = String(s ?? "").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)) + "…";
}

function palette(theme) {
  const t = String(theme || "neo").toLowerCase();
  if (t === "ember") {
    return {
      bg: "#120605",
      panel: "#1a0f0b",
      header: "#fff7ed",
      sub: "#fdba74",
      muted: "#9ca3af",
      circle: "#0e0a09",
      watermark: "#94a3b8"
    };
  }
  if (t === "arcane") {
    return {
      bg: "#05010f",
      panel: "#120a22",
      header: "#f5f3ff",
      sub: "#c4b5fd",
      muted: "#a1a1aa",
      circle: "#0a0614",
      watermark: "#a78bfa"
    };
  }
  // neo (default)
  return {
    bg: "#050816",
    panel: "#0b1220",
    header: "#ffffff",
    sub: "#9ca3af",
    muted: "#64748b",
    circle: "#07131f",
    watermark: "#64748b"
  };
}

function rarityColor(r) {
  switch (String(r || "").toLowerCase()) {
    case "mythic": return "#a855f7";
    case "legendary": return "#f59e0b";
    case "epic": return "#3b82f6";
    case "rare": return "#22c55e";
    case "common": return "#94a3b8";
    default: return "#94a3b8";
  }
}

function rarityLabel(r) {
  return String(r || "common").toUpperCase();
}

function initials(name) {
  const parts = String(name || "U").match(/[A-Za-z0-9]+/g) || ["U"];
  return (parts[0] || "U").slice(0, 2).toUpperCase();
}

function sigilBits(id) {
  const buf = crypto.createHash("sha256").update(String(id || "x")).digest();
  return buf;
}

function sigilDrawCommands({ id, x, y, size, fill = "rgba(255,255,255,0.22)" }) {
  // Deterministic 5x5 icon pattern for each item id.
  const bits = sigilBits(id);
  const grid = 5;
  const cell = Math.max(2, Math.floor(size / grid));
  const half = Math.floor((grid * cell) / 2);
  const startX = x - half;
  const startY = y - half;

  const draws = [];
  let bitIndex = 0;
  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      // Keep center + some random-ish pixels. Roughly ~50% on.
      const byte = bits[bitIndex >> 3] ?? 0;
      const on = ((byte >> (bitIndex & 7)) & 1) === 1;
      bitIndex += 1;
      if (!on && !(gx === 2 && gy === 2)) continue;

      const x1 = startX + gx * cell;
      const y1 = startY + gy * cell;
      const x2 = x1 + cell - 1;
      const y2 = y1 + cell - 1;
      draws.push(`rectangle ${x1},${y1} ${x2},${y2}`);
    }
  }

  if (!draws.length) return [];
  return ["-fill", fill, "-draw", draws.join(" "), "-fill", "none"];
}

export async function renderGatherCardPng({ title = "Gather Run", subtitle = "", items = [], theme = "neo" } = {}) {
  const W = 960;
  const H = 540;
  const safeTitle = clampText(title, 40);
  const safeSubtitle = clampText(subtitle, 80);
  const p = palette(theme);

  const rows = (items || []).slice(0, 4);
  const cardX = 56;
  const cardY = 140;
  const cardW = W - 112;
  const cardH = H - 200;
  const gap = 14;
  const rowH = Math.floor((cardH - gap * (rows.length - 1)) / Math.max(1, rows.length));

  const args = [
    "-size", `${W}x${H}`,
    `xc:${p.bg}`,
    "-alpha", "on",
    // panel
    "-fill", p.panel,
    "-draw", `roundrectangle 36,28 ${W - 36},${H - 28} 20,20`,
    // header
    "-font", "DejaVu-Sans",
    "-fill", p.header,
    "-pointsize", "44",
    "-annotate", "+56+78", safeTitle,
    "-fill", p.sub,
    "-pointsize", "22",
    "-annotate", "+56+110", safeSubtitle
  ];

  for (let i = 0; i < rows.length; i += 1) {
    const it = rows[i] || {};
    const y = cardY + i * (rowH + gap);
    const color = rarityColor(it.rarity);
    const name = clampText(it.name || it.id || "Unknown", 36);
    const lab = rarityLabel(it.rarity);
    const init = initials(it.name || it.id || "U");

    args.push(
      "-fill", p.panel,
      "-stroke", color,
      "-strokewidth", "3",
      "-draw", `roundrectangle ${cardX},${y} ${cardX + cardW},${y + rowH} 16,16`,
      // icon circle
      "-fill", p.circle,
      "-stroke", color,
      "-strokewidth", "4",
      "-draw", `circle ${cardX + 52},${y + Math.floor(rowH / 2)} ${cardX + 52 + 28},${y + Math.floor(rowH / 2)}`,
      // deterministic sigil pattern (unique per item id)
      ...sigilDrawCommands({
        id: it.id || it.name || "x",
        x: cardX + 52,
        y: y + Math.floor(rowH / 2),
        size: 30,
        fill: "rgba(255,255,255,0.22)"
      }),
      // initials (small overlay for readability)
      "-font", "DejaVu-Sans",
      "-fill", "#e5e7eb",
      "-pointsize", "18",
      "-gravity", "NorthWest",
      "-annotate", `+${cardX + 44}+${y + Math.floor(rowH / 2) - 8}`, init,
      // name + rarity
      "-fill", "#e5e7eb",
      "-pointsize", "30",
      "-annotate", `+${cardX + 96}+${y + 58}`, name,
      "-fill", color,
      "-pointsize", "20",
      "-annotate", `+${cardX + 96}+${y + 94}`, lab
    );
  }

  args.push(
    "-fill", p.watermark,
    "-pointsize", "16",
    "-gravity", "SouthEast",
    "-annotate", "+56+40", "Chopsticks Game Engine",
    // Discord previews can be flaky with 16-bit PNGs; force 8-bit output.
    "-depth", "8",
    "-strip",
    "png:-"
  );

  return execFileBuffer("convert", args);
}

/**
 * Convert an SVG string to a PNG Buffer using ImageMagick.
 * Returns null if ImageMagick is unavailable or conversion fails.
 * Used by Phase F card builders (profile, welcome, level-up, battle).
 */
export async function svgToPngBuffer(svgString) {
  if (!svgString) return null;
  const { spawn } = await import("node:child_process");
  return new Promise((resolve) => {
    try {
      const proc = spawn("convert", ["svg:-", "-depth", "8", "-strip", "png:-"], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      const chunks = [];
      proc.stdout.on("data", (d) => chunks.push(d));
      proc.on("close", (code) => {
        if (code !== 0) { resolve(null); return; }
        resolve(Buffer.concat(chunks));
      });
      proc.on("error", () => resolve(null));
      proc.stdin.write(Buffer.from(svgString, "utf8"));
      proc.stdin.end();
    } catch {
      resolve(null);
    }
  });
}
