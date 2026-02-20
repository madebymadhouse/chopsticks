// src/utils/rateLimitConfig.js
// Per-category rate limit configuration for slash commands.
// All limits are configurable via environment variables.
// Returns { limit, windowSec } for a given command name + category.

// ── Category defaults ────────────────────────────────────────────────────────
// Format: [limit, windowSec]  (max N invocations per window)
const CATEGORY_DEFAULTS = {
  mod:       [3,  30],  // Ban/kick/warn: slow to prevent mass-mod abuse
  admin:     [5,  60],  // Server config: very slow, admin-only
  music:     [10, 15],  // Queue/play: frequent but bounded
  voice:     [5,  30],  // Voice setup: moderate
  assistant: [3,  30],  // LLM calls: expensive, strictly bounded
  fun:       [12, 10],  // Fun/games: standard
  core:      [12, 10],  // Help/info: standard
  economy:   [8,  15],  // Economy actions: moderate
  tools:     [8,  15],  // Utility tools: moderate
  // default applied when category is missing or unknown
  _default:  [12, 10],
};

// Env override keys: RL_<CATEGORY>_LIMIT / RL_<CATEGORY>_WINDOW
function loadEnvOverride(category) {
  const key = category.toUpperCase().replace(/-/g, "_");
  const limit  = Number(process.env[`RL_${key}_LIMIT`]);
  const window = Number(process.env[`RL_${key}_WINDOW`]);
  return {
    limit:  Number.isFinite(limit)  && limit  > 0 ? limit  : null,
    window: Number.isFinite(window) && window > 0 ? window : null,
  };
}

// Per-command overrides (highest priority).
// Key: commandName, value: [limit, windowSec]
const COMMAND_OVERRIDES = {
  massban:      [1, 60],
  ban:          [2, 30],
  kick:         [2, 30],
  timeout:      [3, 30],
  purge:        [2, 20],
  warn:         [5, 30],
  clearwarns:   [3, 30],
  "model link": [3, 300], // Sensitive: API key linking
  agent:        [5, 60],
  agents:       [5, 60],
};

/**
 * Return rate limit params for a given command + category.
 * @returns {{ limit: number, windowSec: number }}
 */
export function getRateLimitForCommand(commandName, category = "_default") {
  // 1. Per-command override (highest precedence)
  const cmdOverride = COMMAND_OVERRIDES[String(commandName).toLowerCase()];
  if (cmdOverride) return { limit: cmdOverride[0], windowSec: cmdOverride[1] };

  // 2. Env override for category
  const cat = String(category || "_default").toLowerCase();
  const envOverride = loadEnvOverride(cat);
  const catDefault = CATEGORY_DEFAULTS[cat] || CATEGORY_DEFAULTS._default;

  return {
    limit:     envOverride.limit  ?? catDefault[0],
    windowSec: envOverride.window ?? catDefault[1],
  };
}

/**
 * Expose raw defaults for health endpoint / admin display.
 */
export function getRateLimitDefaults() {
  return Object.fromEntries(
    Object.entries(CATEGORY_DEFAULTS)
      .filter(([k]) => k !== "_default")
      .map(([k, [limit, windowSec]]) => [k, { limit, windowSec }])
  );
}
