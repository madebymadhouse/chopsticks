'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RadioIcon, MusicIcon, ShieldIcon, ZapIcon, SparkleIcon, CoinIcon, GamepadIcon, WrenchIcon, ArrowRightIcon } from '../icons';

const BOT_INVITE = 'https://discord.com/api/oauth2/authorize?client_id=1466382874587431036&permissions=1099514858544&scope=bot%20applications.commands';

type SubcommandRich = { name: string; desc: string };

type CommandData = {
  name: string;
  displayName: string;
  category: string;
  summary: string;
  description: string;
  subcommands?: string[];
  subcommandsRich?: SubcommandRich[];
  permissions?: string;
  examples?: string[];
  tags?: string[];
};

type PrefixCommand = {
  name: string;
  aliases: string[];
  category: string;
  usage: string;
  description: string;
  examples: string[];
  permissions: string;
};

const CATEGORY_ORDER = ['Music', 'Moderation', 'Economy', 'Fun & Games', 'Automation', 'AI', 'Utility'];
const PREFIX_CAT_ORDER = ['Meta', 'Moderation', 'Server', 'Utility', 'Economy', 'Fun', 'Entertainment', 'Minigames', 'Social', 'Voice', 'Media', 'Animals', 'Knowledge', 'Info'];

const CAT_COLORS: Record<string, string> = {
  Music:          '#f472b6',
  Moderation:     '#fb923c',
  Economy:        '#4ade80',
  'Fun & Games':  '#a78bfa',
  Automation:     '#facc15',
  AI:             '#22d3ee',
  Utility:        '#94a3b8',
};

const PERM_STYLE: Record<string, { bg: string; color: string }> = {
  Everyone:  { bg: 'rgba(56,189,248,0.1)',  color: '#38bdf8' },
  Moderator: { bg: 'rgba(251,191,36,0.1)',  color: '#fbbf24' },
  Admin:     { bg: 'rgba(239,68,68,0.1)',   color: '#f87171' },
};

const USE_CASES = [
  { label: 'Protection',  tag: 'protection',  color: '#fb923c' },
  { label: 'Voice',       tag: 'voice',        color: '#f472b6' },
  { label: 'Economy',     tag: 'economy',      color: '#4ade80' },
  { label: 'Agents',      tag: 'agents',       color: '#a78bfa' },
  { label: 'Automation',  tag: 'automation',   color: '#facc15' },
  { label: 'AI',          tag: 'ai',           color: '#22d3ee' },
  { label: 'Games',       tag: 'games',        color: '#c084fc' },
];

// Spotlight command names — displayed as rich cards above the list
const SPOTLIGHT_NAMES = ['music', 'agent', 'automations', 'scripts', 'trivia', 'setup'];

const SPOTLIGHT_TAGLINES: Record<string, string> = {
  music:       '49 concurrent sessions. Full queue control. Lyrics, loop, seek.',
  agent:       'Deploy a near-human actor. Any role. Any channel. Session or permanent.',
  automations: 'Event → action chains. Scriptable. No code required.',
  scripts:     'Fully programmable. Chain commands, variables, conditionals.',
  trivia:      'Multiplayer. Categories. Challenge AI agents. Cross-server competitions.',
  setup:       'Master config. Mod roles, protection, economy, agents — all from here.',
};

export default function CommandsClient() {
  const [tab, setTab] = useState<'slash' | 'prefix'>('slash');
  const [commands, setCommands] = useState<CommandData[]>([]);
  const [prefixCmds, setPrefixCmds] = useState<PrefixCommand[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeUseCase, setActiveUseCase] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/chopsticks-commands.json')
      .then(r => r.json())
      .then((d: unknown) => {
        if (!Array.isArray(d)) return;
        const valid = (d as CommandData[]).filter(
          c => c && typeof c === 'object' &&
               typeof c.name === 'string' && c.name.length > 0 &&
               typeof c.category === 'string' &&
               typeof c.summary === 'string'
        );
        setCommands(valid);
      })
      .catch(() => {});
    fetch('/data/prefix-commands.json')
      .then(r => r.json())
      .then((d: unknown) => {
        if (!Array.isArray(d)) return;
        setPrefixCmds(d as PrefixCommand[]);
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const seen = new Set(commands.map(c => c.category));
    return ['All', ...CATEGORY_ORDER.filter(c => seen.has(c))];
  }, [commands]);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: commands.length };
    commands.forEach(c => { counts[c.category] = (counts[c.category] ?? 0) + 1; });
    return counts;
  }, [commands]);

  const spotlights = useMemo(() =>
    SPOTLIGHT_NAMES.map(n => commands.find(c => c.name === n)).filter(Boolean) as CommandData[],
    [commands]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return commands.filter(c => {
      const matchCat = activeCategory === 'All' || c.category === activeCategory;
      const matchUC = !activeUseCase || (c.tags ?? []).includes(activeUseCase);
      const matchSearch = !q || c.name.includes(q) || c.summary.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      return matchCat && matchUC && matchSearch;
    });
  }, [commands, activeCategory, activeUseCase, search]);

  const totalShowing = filtered.length;

  return (
    <div>
      {/* ── Header ────────────────────────────────────── */}
      <section style={{ borderBottom: '1px solid var(--border)', padding: '4rem 0 2.5rem', background: 'var(--surface)' }}>
        <div className="container">
          <div className="badge" style={{ marginBottom: '1.25rem' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
            Command Reference
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: '0.6rem', fontFamily: 'var(--font-heading)', lineHeight: 1 }}>
            100+ commands.
          </h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.7, marginBottom: '2rem' }}>
            Seven categories. Searchable, filterable, fully documented. Use the spotlights below to explore the most powerful commands first.
          </p>

          {/* Stats bar */}
          <div className="cmd-stats-bar">
            {[
              { val: '101',    label: 'Slash commands' },
              { val: '137',    label: 'Prefix commands' },
              { val: '49',     label: 'Concurrent sessions' },
              { val: 'Agents', label: 'Near-human actors' },
              { val: 'MIT',    label: 'Licensed' },
            ].map(s => (
              <div key={s.label} className="cmd-stat">
                <span className="cmd-stat-val">{s.val}</span>
                <span className="cmd-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '1.5rem' }}>
            {(['slash', 'prefix'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setActiveCategory('All'); setSearch(''); setActiveUseCase(null); }}
                style={{
                  padding: '0.45rem 1.1rem', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 700,
                  fontFamily: 'var(--font-heading)', cursor: 'pointer', letterSpacing: '0.03em',
                  border: `1px solid ${tab === t ? 'var(--accent)60' : 'var(--border)'}`,
                  background: tab === t ? 'var(--accent)14' : 'transparent',
                  color: tab === t ? 'var(--accent)' : 'var(--text-faint)',
                  transition: 'all 0.15s',
                }}>
                {t === 'slash' ? '/ Slash' : '! Prefix'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Spotlights ────────────────────────────────── */}
      {tab === 'slash' && spotlights.length > 0 && (
        <section style={{ padding: '3rem 0', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginBottom: '1.25rem' }}>
              Featured commands
            </p>
            <div className="spotlight-grid">
              {spotlights.map(cmd => {
                const color = CAT_COLORS[cmd.category] ?? 'var(--accent)';
                const tagline = SPOTLIGHT_TAGLINES[cmd.name] ?? cmd.summary;
                return (
                  <div key={cmd.name} className="spotlight-card">
                    <div className="spotlight-card-header">
                      <div style={{ width: 32, height: 32, borderRadius: '0.4rem', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                        {cmd.name === 'music'      && <MusicIcon size={15} />}
                        {cmd.name === 'agent'      && <RadioIcon size={15} />}
                        {cmd.name === 'automations'&& <ZapIcon size={15} />}
                        {cmd.name === 'scripts'    && <ZapIcon size={15} />}
                        {cmd.name === 'trivia'     && <GamepadIcon size={15} />}
                        {cmd.name === 'setup'      && <WrenchIcon size={15} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', fontWeight: 700, color, display: 'block' }}>/{cmd.name}</code>
                        <span style={{ fontSize: '0.65rem', background: `${color}18`, color, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.04em' }}>{cmd.category}</span>
                      </div>
                    </div>
                    <div className="spotlight-card-body">
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '0.875rem' }}>{tagline}</p>
                      {cmd.subcommandsRich && cmd.subcommandsRich.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {cmd.subcommandsRich.slice(0, 5).map(s => (
                            <div key={s.name} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color, background: `${color}10`, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', flexShrink: 0 }}>{s.name}</code>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', lineHeight: 1.5 }}>{s.desc}</span>
                            </div>
                          ))}
                          {cmd.subcommandsRich.length > 5 && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', paddingLeft: '0.25rem' }}>+{cmd.subcommandsRich.length - 5} more subcommands</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Filters ───────────────────────────────────── */}
      {tab === 'slash' && <div style={{ position: 'sticky', top: 58, zIndex: 50, background: 'rgba(8,9,10,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '0.875rem 1.5rem' }}>
          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands..."
              style={{
                width: '100%', padding: '0.6rem 1rem 0.6rem 2.25rem',
                background: 'var(--surface-raised)', border: '1px solid var(--border)',
                borderRadius: '0.5rem', color: 'var(--text)', fontSize: '0.85rem',
                fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.5rem' }}>
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const color = cat === 'All' ? 'var(--accent)' : (CAT_COLORS[cat] ?? 'var(--accent)');
              return (
                <button key={cat} onClick={() => { setActiveCategory(cat); setActiveUseCase(null); }}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
                    fontFamily: 'var(--font-heading)', cursor: 'pointer', letterSpacing: '0.03em',
                    border: `1px solid ${isActive ? color + '60' : 'var(--border)'}`,
                    background: isActive ? `${color}14` : 'transparent',
                    color: isActive ? color : 'var(--text-faint)',
                    transition: 'all 0.15s',
                  }}>
                  {cat} {catCounts[cat] !== undefined && <span style={{ opacity: 0.6 }}>({catCounts[cat]})</span>}
                </button>
              );
            })}
          </div>

          {/* Use-case tags */}
          <div className="use-case-filters">
            <span style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', alignSelf: 'center', marginRight: '0.25rem' }}>Filter by use case:</span>
            {USE_CASES.map(uc => (
              <button key={uc.tag}
                className={`use-case-btn${activeUseCase === uc.tag ? ' active' : ''}`}
                style={activeUseCase === uc.tag ? { background: `${uc.color}12`, borderColor: `${uc.color}40`, color: uc.color } : {}}
                onClick={() => { setActiveUseCase(activeUseCase === uc.tag ? null : uc.tag); setActiveCategory('All'); }}>
                {uc.label}
              </button>
            ))}
            {(activeUseCase || (activeCategory !== 'All') || search) && (
              <button className="use-case-btn" onClick={() => { setActiveUseCase(null); setActiveCategory('All'); setSearch(''); }}>
                Clear filters
              </button>
            )}
          </div>

          <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginTop: '0.375rem' }}>
            {totalShowing} command{totalShowing !== 1 ? 's' : ''} shown
          </p>
        </div>
      </div>}

      {/* ── Prefix command browser ────────────────────── */}
      {tab === 'prefix' && (
        <div className="container" style={{ padding: '2rem 1.5rem 4rem' }}>
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1.125rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.625rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--accent)', flexShrink: 0 }}>!</code>
            <div>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.2rem' }}>Prefix command surface</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Default prefix is <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '0.1em 0.3em', borderRadius: '0.2rem', color: 'var(--accent)' }}>!</code>.
                Change it per-server with <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '0.1em 0.3em', borderRadius: '0.2rem', color: 'var(--accent)' }}>/setup prefix</code> or{' '}
                <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '0.1em 0.3em', borderRadius: '0.2rem', color: 'var(--accent)' }}>!prefix set &lt;char&gt;</code>.
                {' '}137 commands across 14 categories.
              </p>
            </div>
          </div>
          {PREFIX_CAT_ORDER.map(cat => {
            const catCmds = prefixCmds.filter(c => c.category === cat);
            if (catCmds.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)' }}>{cat}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-faint)', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.1rem 0.45rem', fontFamily: 'var(--font-heading)' }}>{catCmds.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {catCmds.map(cmd => (
                    <div key={cmd.name} onClick={() => setExpanded(expanded === `p-${cmd.name}` ? null : `p-${cmd.name}`)}
                      style={{ background: 'var(--surface)', border: `1px solid ${expanded === `p-${cmd.name}` ? 'var(--accent)40' : 'var(--border)'}`, borderRadius: '0.5rem', cursor: 'pointer', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.7rem 1rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <div style={{ width: 3, height: 16, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
                          <code style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', flexShrink: 0 }}>!{cmd.name}</code>
                          {cmd.aliases.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{cmd.aliases.map(a => `!${a}`).join(', ')}</span>}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cmd.description}</span>
                        </div>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{ color: 'var(--text-faint)', transform: expanded === `p-${cmd.name}` ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </div>
                      {expanded === `p-${cmd.name}` && (
                        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--accent)20' }}>
                          <code style={{ display: 'block', marginTop: '0.75rem', marginBottom: '0.75rem', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--accent)', background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.75rem', borderRadius: '0.3rem', border: '1px solid var(--accent)20' }}>{cmd.usage}</code>
                          {cmd.examples.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              {cmd.examples.map(ex => (
                                <code key={ex} style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.3rem 0.625rem', borderRadius: '0.25rem', display: 'block' }}>{ex}</code>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Command list ──────────────────────────────── */}
      {tab === 'slash' && <div className="container" style={{ padding: '0.5rem 1.5rem 4rem' }}>
        {filtered.length === 0 && commands.length > 0 && (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-faint)' }}>
            <p style={{ fontSize: '0.9rem' }}>No commands match your current filters.</p>
            <button onClick={() => { setActiveUseCase(null); setActiveCategory('All'); setSearch(''); }}
              style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-heading)' }}>
              Clear filters
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginTop: '0.75rem' }}>
          {filtered.map(cmd => {
            const isExpanded = expanded === cmd.name;
            const catColor = CAT_COLORS[cmd.category] ?? 'var(--accent)';
            const perm = cmd.permissions ? (PERM_STYLE[cmd.permissions] ?? PERM_STYLE.Everyone) : null;
            return (
              <div
                key={cmd.name}
                onClick={() => setExpanded(isExpanded ? null : cmd.name)}
                style={{
                  background: 'var(--surface)', border: `1px solid ${isExpanded ? catColor + '40' : 'var(--border)'}`,
                  borderRadius: '0.625rem', cursor: 'pointer', overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                    <div style={{ width: 3, height: 20, borderRadius: 2, background: catColor, flexShrink: 0 }} />
                    <code style={{ fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: catColor, flexShrink: 0 }}>
                      /{cmd.name}
                    </code>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cmd.summary}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {/* Use-case tag chips */}
                    {cmd.tags && cmd.tags.slice(0, 2).map(tag => {
                      const uc = USE_CASES.find(u => u.tag === tag);
                      if (!uc) return null;
                      return (
                        <span key={tag} style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '0.25rem', background: `${uc.color}10`, color: uc.color, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', display: 'none' }} className="tag-chip">
                          {uc.label}
                        </span>
                      );
                    })}
                    {perm && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '0.25rem', background: perm.bg, color: perm.color, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em' }}>
                        {cmd.permissions}
                      </span>
                    )}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: 'var(--text-faint)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0 1rem 1.25rem 1rem', borderTop: `1px solid ${catColor}30` }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.75, marginTop: '0.875rem', marginBottom: '1rem' }}>
                      {cmd.description}
                    </p>

                    {/* Rich subcommands */}
                    {cmd.subcommandsRich && cmd.subcommandsRich.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.625rem', fontFamily: 'var(--font-heading)' }}>Subcommands</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          {cmd.subcommandsRich.map(s => (
                            <div key={s.name} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.4rem 0.625rem', background: `${catColor}06`, borderRadius: '0.375rem' }}>
                              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: catColor, flexShrink: 0, minWidth: 80 }}>{s.name}</code>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Flat subcommands fallback */}
                    {!cmd.subcommandsRich && cmd.subcommands && cmd.subcommands.length > 0 && (
                      <div style={{ marginBottom: '0.875rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Subcommands</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                          {cmd.subcommands.map(sub => (
                            <code key={sub} style={{ fontSize: '0.78rem', padding: '0.2rem 0.55rem', background: `${catColor}12`, border: `1px solid ${catColor}30`, borderRadius: '0.3rem', color: catColor, fontFamily: 'var(--font-mono)' }}>
                              {sub}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {cmd.tags && cmd.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.875rem' }}>
                        {cmd.tags.map(tag => {
                          const uc = USE_CASES.find(u => u.tag === tag);
                          if (!uc) return null;
                          return <span key={tag} style={{ fontSize: '0.62rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '999px', background: `${uc.color}10`, color: uc.color, fontFamily: 'var(--font-heading)', letterSpacing: '0.04em', border: `1px solid ${uc.color}25` }}>{uc.label}</span>;
                        })}
                      </div>
                    )}

                    {/* Examples */}
                    {cmd.examples && cmd.examples.length > 0 && (
                      <div>
                        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>Examples</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {cmd.examples.map(ex => (
                            <code key={ex} style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${catColor}25`, borderRadius: '0.3rem', color: catColor, fontFamily: 'var(--font-mono)', display: 'block' }}>
                              {ex}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Agent Pool note — no emoji */}
        <div style={{ marginTop: '2rem', padding: '1rem 1.25rem', background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '0.75rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
          <RadioIcon size={16} style={{ color: '#a78bfa', flexShrink: 0, marginTop: '0.1rem' } as React.CSSProperties} />
          <div>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.2rem' }}>More in the Agent Pool</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Agent interactions are configured per-server via{' '}
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', background: 'rgba(255,255,255,0.06)', padding: '0.1em 0.3em', borderRadius: '0.2rem' }}>/setup agent-pool</code>.{' '}
              <a href="/docs#agent-pool" style={{ color: '#a78bfa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                How it works <ArrowRightIcon size={11} />
              </a>
            </p>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.7rem 1.5rem' }}>
            Add to Discord
          </a>
          <a href="/features" className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.7rem 1.5rem' }}>
            View all features <ArrowRightIcon size={13} />
          </a>
        </div>
      </div>}
    </div>
  );
}
