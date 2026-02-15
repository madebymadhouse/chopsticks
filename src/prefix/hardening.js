function cleanToken(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidAliasName(value) {
  return /^[a-z0-9][a-z0-9_-]{0,23}$/i.test(String(value || ""));
}

export function normalizeAliasName(value) {
  return cleanToken(value);
}

export function parsePrefixArgs(content) {
  const input = String(content || "").trim();
  if (!input) return [];

  const args = [];
  let current = "";
  let quote = null;
  let escape = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (escape) current += "\\";
  if (current) args.push(current);

  return args;
}

export function normalizePrefixValue(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, error: "Prefix cannot be empty." };
  }
  if (raw.length > 4) {
    return { ok: false, error: "Prefix must be 1-4 characters." };
  }
  if (/\s/.test(raw)) {
    return { ok: false, error: "Prefix cannot contain spaces." };
  }
  if (raw.includes("@everyone") || raw.includes("@here") || raw.includes("<@")) {
    return { ok: false, error: "Prefix cannot contain mentions." };
  }
  if (raw.startsWith("/")) {
    return { ok: false, error: "Prefix cannot start with '/'." };
  }
  return { ok: true, value: raw };
}

export function resolveAliasedCommand(name, aliases = {}, maxDepth = 12) {
  const start = cleanToken(name);
  if (!start) {
    return { ok: false, error: "empty", commandName: "", chain: [] };
  }

  const chain = [];
  const seen = new Set([start]);
  let current = start;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!Object.prototype.hasOwnProperty.call(aliases, current)) {
      return { ok: true, commandName: current, chain };
    }

    const target = cleanToken(aliases[current]);
    if (!target) {
      return { ok: false, error: "invalid-target", commandName: current, chain };
    }

    chain.push({ from: current, to: target });
    if (seen.has(target)) {
      return { ok: false, error: "cycle", commandName: current, chain };
    }

    seen.add(target);
    current = target;
  }

  return { ok: false, error: "depth", commandName: current, chain };
}

export function wouldCreateAliasCycle(alias, target, aliases = {}) {
  const nextAliases = { ...aliases, [normalizeAliasName(alias)]: cleanToken(target) };
  const check = resolveAliasedCommand(alias, nextAliases, 20);
  return !check.ok && check.error === "cycle";
}

export function levenshteinDistance(a, b) {
  const x = cleanToken(a);
  const y = cleanToken(b);

  if (!x) return y.length;
  if (!y) return x.length;

  const dp = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = 0; i <= x.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= y.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[x.length][y.length];
}

export function suggestCommandNames(input, candidates, limit = 3) {
  const query = cleanToken(input);
  if (!query) return [];

  const unique = Array.from(new Set((Array.isArray(candidates) ? candidates : [])
    .map(cleanToken)
    .filter(Boolean)));

  const ranked = [];
  for (const candidate of unique) {
    let score = 999;

    if (candidate === query) score = 0;
    else if (candidate.startsWith(query)) score = 1;
    else if (candidate.includes(query)) score = 2;
    else {
      const dist = levenshteinDistance(query, candidate);
      const maxAllowed = Math.max(2, Math.floor(candidate.length / 3));
      if (dist <= maxAllowed) score = 10 + dist;
    }

    if (score < 999) {
      ranked.push({ candidate, score, len: candidate.length });
    }
  }

  ranked.sort((a, b) => a.score - b.score || a.len - b.len || a.candidate.localeCompare(b.candidate));
  return ranked.slice(0, Math.max(1, limit)).map(r => r.candidate);
}
