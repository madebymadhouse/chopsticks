// src/tools/automod/rules.js
// Rule definitions and matchers for the automod engine.

export const RULE_TYPES = [
  "words",        // word/phrase/regex blacklist
  "invites",      // discord invite links
  "links",        // all URLs or specific domain patterns
  "phishing",     // known phishing/scam domains
  "caps",         // excessive capitalization
  "mentions",     // mention spam (too many @user or @role in one message)
  "duplicates",   // repeated identical/near-identical messages in short window
  "newlines",     // excessive blank lines / line spam
];

export const ACTIONS = ["delete", "warn", "timeout", "kick", "ban"];

// Known phishing / scam domain fragments — extend as needed
const PHISHING_PATTERNS = [
  /discord-nitro?\./i,
  /free-nitro\./i,
  /discordapp\.com\.[\w-]+\./i,
  /steamcommunity\.com\.[\w-]+\./i,
  /nitro-gift\./i,
  /discord-gift\./i,
  /gift-discord\./i,
  /claim-nitro\./i,
  /free-steam\./i,
];

// Discord invite regex
const INVITE_PATTERN = /(?:https?:\/\/)?(?:www\.)?(?:discord\.gg|discord\.com\/invite|dsc\.gg)\/[\w-]+/gi;

// General URL regex
const URL_PATTERN = /https?:\/\/[^\s]+/gi;

/**
 * Check a single rule against a message content.
 * @param {string} content - Raw message content
 * @param {object} rule - Rule config object from guildData.automod.rules[type]
 * @param {string} type - Rule type key
 * @param {object} state - Per-user state map (for duplicate/rate checks)
 * @param {string} userId
 * @returns {{ triggered: boolean, reason: string } | false}
 */
export function checkRule(content, rule, type, state, userId) {
  if (!rule?.enabled) return false;

  switch (type) {
    case "words": {
      const patterns = rule.patterns ?? [];
      for (const p of patterns) {
        try {
          const re = new RegExp(p, "i");
          if (re.test(content)) return { triggered: true, reason: `Blocked word/phrase matched: \`${p}\`` };
        } catch {
          // bad regex — skip
        }
      }
      return false;
    }

    case "invites": {
      INVITE_PATTERN.lastIndex = 0;
      if (INVITE_PATTERN.test(content)) return { triggered: true, reason: "Discord invite link detected" };
      return false;
    }

    case "links": {
      const allowed = rule.allowedDomains ?? [];
      URL_PATTERN.lastIndex = 0;
      const urls = content.match(URL_PATTERN) ?? [];
      for (const url of urls) {
        try {
          const hostname = new URL(url).hostname.replace(/^www\./, "");
          if (!allowed.some(d => hostname === d || hostname.endsWith("." + d))) {
            return { triggered: true, reason: `Link blocked: \`${hostname}\`` };
          }
        } catch { /* malformed URL — flag it */ }
      }
      return false;
    }

    case "phishing": {
      URL_PATTERN.lastIndex = 0;
      const urls = content.match(URL_PATTERN) ?? [];
      for (const url of urls) {
        for (const pat of PHISHING_PATTERNS) {
          if (pat.test(url)) return { triggered: true, reason: "Phishing/scam link detected" };
        }
      }
      // also scan raw content (without needing proper URL)
      for (const pat of PHISHING_PATTERNS) {
        if (pat.test(content)) return { triggered: true, reason: "Phishing/scam link detected" };
      }
      return false;
    }

    case "caps": {
      const threshold = rule.threshold ?? 70; // % uppercase
      const min = rule.minLength ?? 10; // minimum length to apply rule
      const stripped = content.replace(/[^a-zA-Z]/g, "");
      if (stripped.length < min) return false;
      const upper = stripped.replace(/[^A-Z]/g, "").length;
      const pct = (upper / stripped.length) * 100;
      if (pct >= threshold) return { triggered: true, reason: `Excessive caps (${Math.round(pct)}% uppercase)` };
      return false;
    }

    case "mentions": {
      const max = rule.max ?? 5;
      const mentionCount = (content.match(/<@[!&]?\d+>/g) ?? []).length;
      if (mentionCount >= max) return { triggered: true, reason: `Mention spam (${mentionCount} mentions)` };
      return false;
    }

    case "duplicates": {
      const windowMs = (rule.windowSeconds ?? 10) * 1000;
      const threshold = rule.threshold ?? 3;
      const key = `dup:${userId}`;
      const now = Date.now();
      const normalized = content.trim().toLowerCase().replace(/\s+/g, " ");

      if (!state.has(key)) state.set(key, { msgs: [], lastClean: now });
      const entry = state.get(key);

      // prune old entries
      entry.msgs = entry.msgs.filter(m => now - m.ts < windowMs);
      entry.msgs.push({ ts: now, content: normalized });

      const dupeCount = entry.msgs.filter(m => m.content === normalized).length;
      if (dupeCount >= threshold) {
        return { triggered: true, reason: `Duplicate message spam (${dupeCount}x in ${rule.windowSeconds ?? 10}s)` };
      }
      return false;
    }

    case "newlines": {
      const max = rule.max ?? 10;
      const newlineCount = (content.match(/\n/g) ?? []).length;
      if (newlineCount >= max) return { triggered: true, reason: `Excessive newlines (${newlineCount})` };
      return false;
    }

    default:
      return false;
  }
}

/**
 * Build a default automod config for a guild (all rules disabled).
 */
export function defaultAutomodConfig() {
  return {
    enabled: false,
    logChannelId: null,
    exemptChannels: [],
    exemptRoles: [],
    rules: {
      words:      { enabled: false, action: "delete", patterns: [] },
      invites:    { enabled: false, action: "delete" },
      links:      { enabled: false, action: "delete", allowedDomains: [] },
      phishing:   { enabled: true,  action: "delete" },
      caps:       { enabled: false, action: "delete", threshold: 70, minLength: 10 },
      mentions:   { enabled: false, action: "timeout", max: 5 },
      duplicates: { enabled: false, action: "delete",  threshold: 3, windowSeconds: 10 },
      newlines:   { enabled: false, action: "delete", max: 10 },
    },
  };
}
