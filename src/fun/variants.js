function titleCase(text) {
  return String(text || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const t = Math.trunc(n);
  if (t < min) return min;
  if (t > max) return max;
  return t;
}

const THEMES = [
  { key: "hype", tag: "HYPE", verbs: ["launches", "amplifies", "levels up"], objects: ["the whole lobby", "the momentum", "the leaderboard"] },
  { key: "roast", tag: "ROAST", verbs: ["outplays", "counter-roasts", "debugs"], objects: ["the hot take", "the weak strat", "the bad build"] },
  { key: "compliment", tag: "GLOW", verbs: ["upgrades", "boosts", "champions"], objects: ["team morale", "the skill floor", "the vibe"] },
  { key: "quest", tag: "QUEST", verbs: ["accepts", "speedruns", "completes"], objects: ["a side quest", "the daily mission", "the raid prep"] },
  { key: "duel", tag: "DUEL", verbs: ["challenges", "parries", "wins"], objects: ["the arena", "the bracket", "the finals"] },
  { key: "chaos", tag: "CHAOS", verbs: ["rewrites", "shuffles", "flips"], objects: ["the playbook", "the script", "the timeline"] },
  { key: "cosmic", tag: "COSMIC", verbs: ["warps", "orbits", "supernovas"], objects: ["the map", "the queue", "the meta"] },
  { key: "meme", tag: "MEME", verbs: ["drops", "stacks", "spams"], objects: ["a prime meme", "top-tier emotes", "instant classics"] },
  { key: "bard", tag: "BARD", verbs: ["composes", "harmonizes", "improvises"], objects: ["a battle anthem", "a tavern hit", "a victory chorus"] },
  { key: "wizard", tag: "WIZ", verbs: ["casts", "channels", "enchants"], objects: ["the lobby", "the queue", "the next run"] },
  { key: "pirate", tag: "PIRATE", verbs: ["raids", "navigates", "captures"], objects: ["the treasure cache", "the command deck", "the high seas"] },
  { key: "ninja", tag: "NINJA", verbs: ["slips through", "strikes", "vanishes from"], objects: ["the defense", "the shadows", "the flank"] },
  { key: "robot", tag: "BOT", verbs: ["optimizes", "calculates", "executes"], objects: ["the route", "the uptime", "the action queue"] },
  { key: "retro", tag: "RETRO", verbs: ["rewinds", "pixel-boosts", "arcade-charges"], objects: ["the stage", "the run", "the combo"] },
  { key: "cyber", tag: "CYBER", verbs: ["patches", "firewalls", "syncs"], objects: ["the node", "the stack", "the shard"] },
  { key: "mythic", tag: "MYTH", verbs: ["awakens", "summons", "defeats"], objects: ["an ancient boss", "the titan", "the relic guardian"] },
  { key: "sports", tag: "SPORT", verbs: ["clutches", "drafts", "carries"], objects: ["the final round", "the squad", "the championship energy"] },
  { key: "arcade", tag: "ARCADE", verbs: ["chains", "hits", "extends"], objects: ["a combo", "a streak", "the score cap"] },
  { key: "samurai", tag: "SAMURAI", verbs: ["focuses", "disciplines", "cuts through"], objects: ["the noise", "the doubt", "the obstacle"] },
  { key: "builder", tag: "BUILD", verbs: ["crafts", "stabilizes", "fortifies"], objects: ["the base", "the blueprint", "the operation"] }
];

const STYLES = [
  { key: "burst", label: "Burst", opener: "quick spark", closer: "Short, sharp, and clean." },
  { key: "epic", label: "Epic", opener: "full cinematic mode", closer: "Roll credits on that play." },
  { key: "wholesome", label: "Wholesome", opener: "friendly energy", closer: "Everyone wins the vibe check." },
  { key: "dramatic", label: "Dramatic", opener: "high stakes", closer: "Nobody blinked during that moment." },
  { key: "silly", label: "Silly", opener: "maximum nonsense", closer: "It should not work, but it works." },
  { key: "speedrun", label: "Speedrun", opener: "timer on", closer: "Split time: optimized." },
  { key: "cinematic", label: "Cinematic", opener: "camera sweep", closer: "Frame this for the highlights." },
  { key: "legend", label: "Legend", opener: "hall of fame pressure", closer: "This one goes in server history." },
  { key: "boss", label: "Boss", opener: "final boss posture", closer: "Phase cleared with authority." },
  { key: "party", label: "Party", opener: "group hype", closer: "Queue up the celebration emotes." },
  { key: "mystery", label: "Mystery", opener: "fog of war", closer: "Nobody predicted that ending." }
];

const INTENSITY_TEXT = {
  1: "calm",
  2: "steady",
  3: "strong",
  4: "wild",
  5: "max"
};

const CATALOG = [];
for (const theme of THEMES) {
  for (const style of STYLES) {
    const id = `${theme.key}-${style.key}`;
    CATALOG.push({
      id,
      label: `${titleCase(theme.key)} ${style.label}`,
      themeKey: theme.key,
      styleKey: style.key,
      themeTag: theme.tag,
      styleLabel: style.label,
      searchable: `${id} ${theme.key} ${style.key} ${theme.tag}`
    });
  }
}

CATALOG.sort((a, b) => a.id.localeCompare(b.id));

const VARIANT_MAP = new Map(CATALOG.map(v => [v.id, v]));
const THEME_MAP = new Map(THEMES.map(t => [t.key, t]));
const STYLE_MAP = new Map(STYLES.map(s => [s.key, s]));

export const FUN_VARIANTS = CATALOG;
export const FUN_VARIANT_COUNT = CATALOG.length;

export function clampIntensity(value) {
  return clampNumber(value, 1, 5, 3);
}

export function listVariantStats() {
  return {
    total: FUN_VARIANT_COUNT,
    themes: THEMES.length,
    styles: STYLES.length
  };
}

export function sampleVariantIds(limit = 12) {
  const max = clampNumber(limit, 1, 50, 12);
  return CATALOG.slice(0, max).map(v => v.id);
}

export function getVariantById(id) {
  return VARIANT_MAP.get(String(id || "").trim().toLowerCase()) || null;
}

function scoreMatch(query, item) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return 100;
  if (item.id === q) return 0;
  if (item.id.startsWith(q)) return 1;
  if (item.label.toLowerCase().startsWith(q)) return 2;
  if (item.searchable.includes(q)) return 3;
  return 999;
}

export function findVariants(query, limit = 25) {
  const max = clampNumber(limit, 1, 25, 25);
  const ranked = [];
  for (const item of CATALOG) {
    const score = scoreMatch(query, item);
    if (score < 999) ranked.push({ item, score });
  }
  ranked.sort((a, b) => a.score - b.score || a.item.id.localeCompare(b.item.id));
  return ranked.slice(0, max).map(r => r.item);
}

export function randomVariantId() {
  const pick = CATALOG[Math.floor(Math.random() * CATALOG.length)];
  return pick?.id || CATALOG[0]?.id || "hype-burst";
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)] || list[0] || "does a thing";
}

export function renderFunVariant({ variantId, actorTag, target, intensity }) {
  const resolved = getVariantById(variantId) || getVariantById(randomVariantId());
  if (!resolved) {
    return {
      ok: false,
      error: "variant-not-found"
    };
  }

  const theme = THEME_MAP.get(resolved.themeKey);
  const style = STYLE_MAP.get(resolved.styleKey);
  if (!theme || !style) {
    return {
      ok: false,
      error: "variant-corrupt"
    };
  }

  const level = clampIntensity(intensity);
  const pace = INTENSITY_TEXT[level] || INTENSITY_TEXT[3];
  const subject = String(target || "").trim() || String(actorTag || "the crew");
  const actor = String(actorTag || "someone");

  const action = `${subject} ${pickOne(theme.verbs)} ${pickOne(theme.objects)}`;
  const narration = `[${theme.tag}] [${style.styleLabel || style.label}] ${style.opener}; intensity: ${pace}.`;
  const line = `${narration} ${action}. ${style.closer}`;

  return {
    ok: true,
    variant: resolved,
    intensity: level,
    text: line,
    metaLine: `Variant: ${resolved.id} | Actor: ${actor}`
  };
}
