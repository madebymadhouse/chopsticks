function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

export function buildGatherCardSvg({ title, subtitle, items = [] } = {}) {
  const W = 960;
  const H = 540;
  const safeTitle = esc(title || "Gather Run");
  const safeSubtitle = esc(subtitle || "");

  const rows = items.slice(0, 4);
  const cardX = 56;
  const cardY = 140;
  const cardW = W - 112;
  const cardH = H - 200;
  const gap = 14;
  const rowH = Math.floor((cardH - gap * (rows.length - 1)) / Math.max(1, rows.length));

  const blocks = rows.map((it, idx) => {
    const y = cardY + idx * (rowH + gap);
    const name = esc(it?.name || it?.id || "Unknown");
    const rarity = String(it?.rarity || "common");
    const color = rarityColor(rarity);
    const label = esc(rarityLabel(rarity));
    const initials = esc((String(it?.name || it?.id || "U").trim().match(/[A-Za-z0-9]+/g) || ["U"])[0].slice(0, 2).toUpperCase());

    return `
      <g>
        <rect x="${cardX}" y="${y}" rx="16" ry="16" width="${cardW}" height="${rowH}" fill="#0b1220" stroke="${color}" stroke-width="3" opacity="0.98" />
        <circle cx="${cardX + 52}" cy="${y + Math.floor(rowH / 2)}" r="28" fill="#07131f" stroke="${color}" stroke-width="4"/>
        <text x="${cardX + 52}" y="${y + Math.floor(rowH / 2) + 10}" text-anchor="middle" font-size="22" font-family="DejaVu Sans, sans-serif" fill="#e5e7eb" font-weight="800">${initials}</text>
        <text x="${cardX + 96}" y="${y + 58}" font-size="30" font-family="DejaVu Sans, sans-serif" fill="#e5e7eb" font-weight="800">${name}</text>
        <text x="${cardX + 96}" y="${y + 94}" font-size="20" font-family="DejaVu Sans, sans-serif" fill="${color}" font-weight="800">${label}</text>
      </g>
    `;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050816"/>
      <stop offset="55%" stop-color="#0b1020"/>
      <stop offset="100%" stop-color="#0a1a2b"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.00"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="36" y="28" rx="20" ry="20" width="${W - 72}" height="${H - 56}" fill="#0b1220" opacity="0.55" filter="url(#shadow)"/>
  <rect x="36" y="28" rx="20" ry="20" width="${W - 72}" height="${H - 56}" fill="url(#sheen)" opacity="1"/>

  <text x="56" y="78" font-size="40" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">${safeTitle}</text>
  <text x="56" y="110" font-size="20" font-family="DejaVu Sans, sans-serif" fill="#9ca3af" font-weight="700">${safeSubtitle}</text>

  ${blocks}

  <text x="${W - 56}" y="${H - 40}" text-anchor="end" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#64748b">
    Chopsticks Game Engine
  </text>
</svg>`;
}

export function buildWorkCardSvg({ title, subtitle, rewardText, bonusText } = {}) {
  const W = 960;
  const H = 540;
  const safeTitle = esc(title || "Work Completed");
  const safeSubtitle = esc(subtitle || "");
  const safeReward = esc(rewardText || "");
  const safeBonus = esc(bonusText || "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#061018"/>
      <stop offset="55%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#0a2a1b"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="48" y="40" rx="22" ry="22" width="${W - 96}" height="${H - 80}" fill="#0b1220" opacity="0.60" filter="url(#shadow)"/>

  <text x="72" y="108" font-size="42" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">${safeTitle}</text>
  <text x="72" y="144" font-size="20" font-family="DejaVu Sans, sans-serif" fill="#9ca3af" font-weight="700">${safeSubtitle}</text>

  <rect x="72" y="190" rx="18" ry="18" width="${W - 144}" height="120" fill="#07131f" stroke="#22c55e" stroke-width="3" opacity="0.98"/>
  <text x="102" y="258" font-size="34" font-family="DejaVu Sans, sans-serif" fill="#e5e7eb" font-weight="900">Reward: ${safeReward}</text>

  ${
    safeBonus
      ? `<rect x="72" y="332" rx="18" ry="18" width="${W - 144}" height="120" fill="#07131f" stroke="#f59e0b" stroke-width="3" opacity="0.98"/>
         <text x="102" y="400" font-size="28" font-family="DejaVu Sans, sans-serif" fill="#e5e7eb" font-weight="900">Bonus: ${safeBonus}</text>`
      : ""
  }

  <text x="${W - 72}" y="${H - 64}" text-anchor="end" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#64748b">
    Chopsticks Game Engine
  </text>
</svg>`;
}

// ── Phase F: New SVG Card Types ───────────────────────────────────────────────

/**
 * S1 — Profile Card v2
 * Dynamic profile card with username, level, XP bar, prestige, credits, title
 */
export function buildProfileCardSvg({ username, level = 1, xp = 0, xpNeeded = 100, credits = 0, prestige = 0, title = "Member", avatarUrl = null } = {}) {
  const W = 900;
  const H = 280;
  const safeUser = esc(username || "Unknown");
  const safeTitle = esc(title);
  const pct = Math.min(100, Math.max(0, Math.round((xp / Math.max(1, xpNeeded)) * 100)));
  const barW = W - 280 - 40;
  const filledW = Math.round(barW * pct / 100);
  const PRESTIGE_STARS = ["", "⭐", "🌟", "💫", "✨", "🔥", "👑", "🌈", "💎", "🌙", "☀️"];
  const prestigeStr = esc(prestige > 0 ? (PRESTIGE_STARS[Math.min(prestige, PRESTIGE_STARS.length - 1)] || `P${prestige}`) : "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#161b22"/>
    </linearGradient>
    <linearGradient id="xpbar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#5865F2"/>
      <stop offset="100%" stop-color="#7c83f5"/>
    </linearGradient>
    <clipPath id="avatar"><circle cx="140" cy="140" r="90"/></clipPath>
    <filter id="glow"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="18"/>
  <rect x="1" y="1" width="${W-2}" height="${H-2}" rx="17" fill="none" stroke="#30363d" stroke-width="1.5"/>
  <!-- Avatar placeholder -->
  <circle cx="140" cy="140" r="90" fill="#21262d" stroke="#5865F2" stroke-width="3"/>
  <text x="140" y="155" text-anchor="middle" font-size="56" font-family="DejaVu Sans, sans-serif" fill="#5865F2" font-weight="900">${esc((safeUser[0] || "?").toUpperCase())}</text>
  <!-- Content area -->
  <text x="280" y="70" font-size="34" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">${safeUser}${prestigeStr ? ` ${prestigeStr}` : ""}</text>
  <text x="280" y="105" font-size="18" font-family="DejaVu Sans, sans-serif" fill="#8b949e">${safeTitle}</text>
  <!-- Level badge -->
  <rect x="280" y="120" rx="10" ry="10" width="90" height="36" fill="#5865F2"/>
  <text x="325" y="144" text-anchor="middle" font-size="18" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">Lv. ${level}</text>
  <!-- Credits -->
  <text x="390" y="144" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#8b949e">💰 ${credits.toLocaleString()} credits</text>
  <!-- XP Bar -->
  <text x="280" y="185" font-size="14" font-family="DejaVu Sans, sans-serif" fill="#8b949e">XP  ${xp.toLocaleString()} / ${xpNeeded.toLocaleString()}  (${pct}%)</text>
  <rect x="280" y="196" rx="8" ry="8" width="${barW}" height="20" fill="#21262d"/>
  <rect x="280" y="196" rx="8" ry="8" width="${filledW}" height="20" fill="url(#xpbar)" filter="url(#glow)"/>
  <!-- Footer -->
  <text x="${W-20}" y="${H-14}" text-anchor="end" font-size="13" font-family="DejaVu Sans, sans-serif" fill="#484f58">Chopsticks</text>
</svg>`;
}

/**
 * S2 — Welcome Card
 * Shown when a new member joins the server
 */
export function buildWelcomeCardSvg({ username, memberCount = 1, serverName = "Server", avatarInitial = "?" } = {}) {
  const W = 900;
  const H = 260;
  const safeUser = esc(username || "New Member");
  const safeServer = esc(serverName);
  const safeInitial = esc(String(avatarInitial)[0]?.toUpperCase() || "?");
  const safeCount = `Member #${Number(memberCount).toLocaleString()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1b2a"/>
      <stop offset="100%" stop-color="#1a2d42"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#57F287"/>
      <stop offset="100%" stop-color="#3ca865"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="18"/>
  <rect x="0" y="${H-8}" width="${W}" height="8" fill="url(#accent)" rx="4"/>
  <!-- Avatar -->
  <circle cx="130" cy="130" r="85" fill="#0d2a1b" stroke="#57F287" stroke-width="4" filter="url(#glow)"/>
  <text x="130" y="148" text-anchor="middle" font-size="60" font-family="DejaVu Sans, sans-serif" fill="#57F287" font-weight="900">${safeInitial}</text>
  <!-- Text -->
  <text x="260" y="80" font-size="22" font-family="DejaVu Sans, sans-serif" fill="#8b949e">Welcome to ${safeServer}!</text>
  <text x="260" y="140" font-size="44" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">${safeUser}</text>
  <text x="260" y="180" font-size="20" font-family="DejaVu Sans, sans-serif" fill="#57F287">${safeCount}</text>
  <text x="${W-20}" y="${H-22}" text-anchor="end" font-size="13" font-family="DejaVu Sans, sans-serif" fill="#484f58">Chopsticks</text>
</svg>`;
}

/**
 * S2 — Level-Up Card
 * Shown when a user levels up
 */
export function buildLevelUpCardSvg({ username, fromLevel = 1, toLevel = 2, xpGained = 0, crateGranted = null } = {}) {
  const W = 900;
  const H = 240;
  const safeUser = esc(username || "Player");
  const crate = crateGranted ? esc(String(crateGranted)) : null;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a1200"/>
      <stop offset="100%" stop-color="#2a1f00"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#F0B232"/>
      <stop offset="100%" stop-color="#ffd700"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="18"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#gold)" rx="3"/>
  <!-- Star burst -->
  <text x="100" y="145" text-anchor="middle" font-size="80" font-family="DejaVu Sans, sans-serif" fill="#F0B232" filter="url(#glow)">⭐</text>
  <!-- Content -->
  <text x="220" y="75" font-size="20" font-family="DejaVu Sans, sans-serif" fill="#c9a227">LEVEL UP!</text>
  <text x="220" y="135" font-size="50" font-family="DejaVu Sans, sans-serif" fill="#ffffff" font-weight="900">${safeUser}</text>
  <text x="220" y="175" font-size="24" font-family="DejaVu Sans, sans-serif" fill="#F0B232">
    Level ${fromLevel} → <tspan font-weight="900" font-size="30">Level ${toLevel}</tspan>
  </text>
  ${xpGained > 0 ? `<text x="220" y="208" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#8b949e">+${xpGained.toLocaleString()} XP earned</text>` : ""}
  ${crate ? `<text x="${W-160}" y="135" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#F0B232">🎁 ${crate}</text>` : ""}
  <text x="${W-20}" y="${H-14}" text-anchor="end" font-size="13" font-family="DejaVu Sans, sans-serif" fill="#484f58">Chopsticks</text>
</svg>`;
}

/**
 * S3 — Battle Result Card
 * Shown after a !battle or /battle resolves
 */
export function buildBattleCardSvg({ winner, loser, winnerLevel = 1, loserLevel = 1, wager = 0, xpGained = 0, rounds = [] } = {}) {
  const W = 900;
  const H = 320;
  const safeWinner = esc(winner || "Winner");
  const safeLoser = esc(loser || "Loser");
  const safeRounds = rounds.slice(0, 3).map(r => `<text x="60" y="${180 + rounds.indexOf(r) * 32}" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#8b949e">${esc(r)}</text>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0d0d"/>
      <stop offset="100%" stop-color="#1a0a0a"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="18"/>
  <rect x="0" y="0" width="${W}" height="6" fill="#ED4245" rx="3"/>
  <!-- VS display -->
  <text x="60" y="80" font-size="48" font-family="DejaVu Sans, sans-serif" fill="#57F287" font-weight="900">${safeWinner}</text>
  <text x="60" y="108" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#8b949e">Level ${winnerLevel} • Winner 🏆</text>
  <text x="${W/2}" y="100" text-anchor="middle" font-size="36" font-family="DejaVu Sans, sans-serif" fill="#ED4245" font-weight="900" filter="url(#glow)">⚔️</text>
  <text x="${W-60}" y="80" text-anchor="end" font-size="48" font-family="DejaVu Sans, sans-serif" fill="#ED4245" font-weight="900">${safeLoser}</text>
  <text x="${W-60}" y="108" text-anchor="end" font-size="16" font-family="DejaVu Sans, sans-serif" fill="#8b949e">Level ${loserLevel} • Defeated</text>
  <!-- Divider -->
  <line x1="40" y1="130" x2="${W-40}" y2="130" stroke="#30363d" stroke-width="1.5"/>
  <!-- Rounds -->
  ${safeRounds}
  <!-- Stats -->
  ${wager > 0 ? `<text x="60" y="${H-40}" font-size="18" font-family="DejaVu Sans, sans-serif" fill="#F0B232" font-weight="700">💰 ${safeWinner} wins ${(wager*2).toLocaleString()} credits</text>` : ""}
  ${xpGained > 0 ? `<text x="60" y="${H-18}" font-size="15" font-family="DejaVu Sans, sans-serif" fill="#8b949e">+${xpGained} XP awarded</text>` : ""}
  <text x="${W-20}" y="${H-14}" text-anchor="end" font-size="13" font-family="DejaVu Sans, sans-serif" fill="#484f58">Chopsticks</text>
</svg>`;
}
