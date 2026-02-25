import type { Metadata } from 'next';
import {
  DiscordIcon, GitHubIcon, DockerIcon, StarIcon, ArrowRightIcon,
  ShieldIcon, MusicIcon, ZapIcon, CoinIcon, GamepadIcon, WrenchIcon, SparkleIcon,
  ServerIcon, PaletteIcon, UsersIcon, GitPullRequestIcon, BookOpenIcon,
  RadioIcon, CheckIcon,
} from './icons';

export const metadata: Metadata = {
  title: 'Chopsticks — Discord Bot by WokSpec',
  description: '60+ slash commands covering music, moderation, economy, games, AI, and the Agent Pool system. Open source, community-built, free forever.',
};

const BOT_INVITE = 'https://discord.com/api/oauth2/authorize?client_id=1466382874587431036&permissions=1099514858544&scope=bot%20applications.commands';
const GITHUB = 'https://github.com/WokSpec/Chopsticks';

const CATEGORIES = [
  { name: 'Moderation', count: 15, Icon: ShieldIcon, cls: 'cat-mod', desc: 'Ban, kick, mute, warn, purge. Hierarchy-safe. Every action logged.' },
  { name: 'Fun & Games', count: 13, Icon: GamepadIcon, cls: 'cat-games', desc: 'Trivia, battle, ship, Would You Rather, riddles. Built for active communities.' },
  { name: 'Automation', count: 13, Icon: ZapIcon, cls: 'cat-auto', desc: 'Reaction roles, welcome messages, auto-roles, scheduled messages. Set once.' },
  { name: 'Economy', count: 8, Icon: CoinIcon, cls: 'cat-eco', desc: 'Credits, shop, daily claims, leaderboard, heist, auctions. Keeps members engaged.' },
  { name: 'Utility', count: 8, Icon: WrenchIcon, cls: 'cat-util', desc: 'Weather, GitHub repos, Wikipedia, polls, reminders, server info.' },
  { name: 'Music', count: 1, Icon: MusicIcon, cls: 'cat-music', desc: '49 concurrent sessions. YouTube, Spotify, SoundCloud. Agents can also read books, stories, or research papers aloud.' },
  { name: 'AI', count: 2, Icon: SparkleIcon, cls: 'cat-ai', desc: 'Open source AI models. Chat, voice, near-human personas. Deploy agents that think and respond like real users.' },
];

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', minHeight: '90vh', display: 'flex', alignItems: 'center' }} className="bg-grid">
        <div className="orb orb-blue" style={{ width: 720, height: 720, top: -260, left: -200, opacity: 0.75 }} />
        <div className="orb orb-violet" style={{ width: 520, height: 520, bottom: -160, right: -100, opacity: 0.7 }} />

        <div className="container" style={{ position: 'relative', zIndex: 1, width: '100%', paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="hero-grid">
            {/* Left */}
            <div>
              <div className="badge" style={{ marginBottom: '1.75rem' }}>
                <span className="dot-live" />
                Open source · by goot27
              </div>

              <h1 style={{
                fontSize: 'clamp(3rem, 7vw, 5.5rem)',
                fontWeight: 700,
                letterSpacing: '-0.05em',
                lineHeight: 1.0,
                color: 'var(--text)',
                marginBottom: '1.5rem',
                fontFamily: 'var(--font-heading)',
              }}>
                The open source<br />
                <span className="gradient-text">Discord bot.</span>
              </h1>

              <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: '440px', marginBottom: '2.25rem' }}>
                Music, moderation, economy, games, and AI agents — 60+ commands built and maintained by the community. Use the hosted instance or run your own.
              </p>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.875rem 1.875rem', fontSize: '0.9rem' }}>
                  <DiscordIcon size={16} />
                  Add to Discord
                </a>
                <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: '0.875rem 1.5rem', fontSize: '0.9rem' }}>
                  <StarIcon size={15} />
                  Star on GitHub
                </a>
              </div>

              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                {[
                  { v: '60+', l: 'Commands' },
                  { v: '49', l: 'Concurrent players' },
                  { v: 'Agents', l: 'Near-human actors' },
                  { v: 'Free', l: 'Forever' },
                ].map(s => (
                  <div key={s.l} className="stat-item">
                    <span className="stat-value">{s.v}</span>
                    <span className="stat-label">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Discord mockup */}
            <div style={{ position: 'relative' }}>
              <div className="discord-window" style={{ fontSize: '13px' }}>
                <div style={{ background: '#1e1f22', borderBottom: '1px solid rgba(0,0,0,0.3)', padding: '0.5rem 0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {['#ef4444','#f59e0b','#22c55e'].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(148,155,164,0.7)', marginLeft: '0.5rem', fontFamily: 'var(--font-mono)' }}>Wok Specialists · #bot-commands</span>
                </div>
                <div style={{ display: 'flex', height: 340 }}>
                  <div className="discord-sidebar">
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,155,164,0.6)', padding: '0.75rem 0.6rem 0.4rem' }}>Text Channels</div>
                    {['general','bot-commands','music','memes'].map((ch, i) => (
                      <div key={ch} className={`discord-channel${i===1?' active':''}`}>{ch}</div>
                    ))}
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(148,155,164,0.6)', padding: '0.75rem 0.6rem 0.4rem', marginTop: '0.5rem' }}>Voice Channels</div>
                    <div className="discord-channel" style={{ paddingLeft: '0.6rem' }}>Lounge</div>
                  </div>
                  <div className="discord-messages">
                    <div className="discord-msg">
                      <div className="discord-avatar" style={{ background: '#5865f2', color: '#fff' }}>A</div>
                      <div className="discord-msg-body">
                        <div className="discord-msg-author" style={{ color: '#5865f2' }}>Alex<span style={{ fontSize: '0.68rem', color: 'rgba(148,155,164,0.5)', fontWeight: 400, marginLeft: '0.4rem' }}>Today at 3:14 PM</span></div>
                        <div className="discord-msg-text discord-slash">/music play lofi hip hop</div>
                      </div>
                    </div>
                    <div className="discord-msg">
                      <div className="discord-avatar" style={{ background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: '#000', fontSize: '0.65rem', fontWeight: 800 }}>CH</div>
                      <div className="discord-msg-body">
                        <div className="discord-msg-author" style={{ color: '#38bdf8' }}>Chopsticks<span style={{ fontSize: '0.65rem', background: '#5865f2', color: '#fff', borderRadius: '0.2rem', padding: '0.05rem 0.3rem', marginLeft: '0.35rem', fontWeight: 700 }}>APP</span><span style={{ fontSize: '0.68rem', color: 'rgba(148,155,164,0.5)', fontWeight: 400, marginLeft: '0.4rem' }}>Today at 3:14 PM</span></div>
                        <div className="discord-embed" style={{ borderLeftColor: '#f472b6' }}>
                          <div className="discord-embed-title">Now Playing</div>
                          <div className="discord-embed-body">lofi hip hop radio — beats to relax/study to</div>
                          <div className="discord-embed-row">
                            <div className="discord-embed-field"><span className="discord-embed-field-name">Duration</span><span className="discord-embed-field-val">Live</span></div>
                            <div className="discord-embed-field"><span className="discord-embed-field-name">Requested by</span><span className="discord-embed-field-val">Alex</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="discord-msg">
                      <div className="discord-avatar" style={{ background: '#ed4245', color: '#fff' }}>M</div>
                      <div className="discord-msg-body">
                        <div className="discord-msg-author" style={{ color: '#ed4245' }}>Maya</div>
                        <div className="discord-msg-text discord-slash">/balance</div>
                      </div>
                    </div>
                    <div className="discord-msg">
                      <div className="discord-avatar" style={{ background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: '#000', fontSize: '0.65rem', fontWeight: 800 }}>CH</div>
                      <div className="discord-msg-body">
                        <div className="discord-msg-author" style={{ color: '#38bdf8' }}>Chopsticks<span style={{ fontSize: '0.65rem', background: '#5865f2', color: '#fff', borderRadius: '0.2rem', padding: '0.05rem 0.3rem', marginLeft: '0.35rem', fontWeight: 700 }}>APP</span></div>
                        <div className="discord-embed" style={{ borderLeftColor: '#4ade80' }}>
                          <div className="discord-embed-title">Maya's Balance</div>
                          <div className="discord-embed-row">
                            <div className="discord-embed-field"><span className="discord-embed-field-name">Wallet</span><span className="discord-embed-field-val">4,250 cr</span></div>
                            <div className="discord-embed-field"><span className="discord-embed-field-name">Bank</span><span className="discord-embed-field-val">12,800 cr</span></div>
                            <div className="discord-embed-field"><span className="discord-embed-field-name">Rank</span><span className="discord-embed-field-val">#3</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="discord-msg">
                      <div className="discord-avatar" style={{ background: 'linear-gradient(135deg,#38bdf8,#0284c7)', color: '#000', opacity: 0.7, fontSize: '0.65rem', fontWeight: 800 }}>CH</div>
                      <div className="discord-msg-body" style={{ paddingTop: '0.5rem' }}>
                        <div className="typing-dots"><span /><span /><span /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', top: -10, right: -10, background: 'var(--green)', color: '#000', fontSize: '0.62rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '999px', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#000', opacity: 0.5 }} />
                ONLINE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Agent Pool ────────────────────────────── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)', background: 'var(--surface)', overflow: 'hidden', position: 'relative' }}>
        <div className="orb orb-violet" style={{ width: 500, height: 500, top: -150, right: -150, opacity: 0.3, position: 'absolute' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="agent-pool-grid">
            {/* Left */}
            <div>
              <div className="badge" style={{ marginBottom: '1.25rem', borderColor: 'rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', color: '#a78bfa' }}>
                <RadioIcon size={12} />
                Flagship Feature
              </div>
              <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.1, marginBottom: '1rem' }}>
                The <span className="gradient-text">Agent Pool.</span>
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '2rem', maxWidth: '480px' }}>
                A community-powered system where bot tokens are pooled and dispatched to voice channels on demand. Servers request an agent — the pool handles the rest. No token management. No friction.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { Icon: ZapIcon, title: 'Near-human actors', desc: 'Give an agent a name, persona, and tone. Configure how it talks, what it responds to, and how it behaves — members may forget it\'s a bot.' },
                  { Icon: RadioIcon, title: 'Any role, any channel', desc: 'DJ in voice. Support agent in #help. Onboarding guide in #welcome. Trivia opponent in #games. Permanently bound or session-based — your call.' },
                  { Icon: CoinIcon, title: 'Credit economy', desc: 'Spend server credits to deploy agents, trigger sounds, interrupt conversations, or run sessions. Earn credits through normal server activity.' },
                  { Icon: UsersIcon, title: 'Cross-server competitions', desc: 'Register your agent for the public pool. Compete against other servers in trivia arenas and cross-pool leaderboards.' },
                ].map(({ Icon, title, desc }) => (
                  <div key={title} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '0.4rem', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', flexShrink: 0 }}>
                      <Icon size={15} />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.15rem' }}>{title}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="/docs#agent-pool" className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.65rem 1.25rem' }}>
                How it works <ArrowRightIcon size={14} />
              </a>
            </div>

            {/* Right — diagram */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.18)', borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <RadioIcon size={14} style={{ color: '#a78bfa' } as React.CSSProperties} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: '#a78bfa', fontWeight: 600 }}>AGENT POOL</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>community-maintained</span>
              </div>
              {/* Pool diagram steps */}
              {[
                { step: '01', label: 'User runs /agent join', sub: 'in any server with credits', color: 'var(--accent)' },
                { step: '02', label: 'Pool finds an available bot', sub: 'encrypted token, dispatched securely', color: '#a78bfa' },
                { step: '03', label: 'Bot joins the voice channel', sub: 'ready for music, AI, trivia, or greetings', color: 'var(--green)' },
                { step: '04', label: 'Credits deducted, session runs', sub: 'admin configures actions and costs via /setup', color: '#f472b6' },
              ].map(item => (
                <div key={item.step} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '0.625rem', padding: '0.875rem 1rem',
                  display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: item.color, fontWeight: 700, opacity: 0.7, flexShrink: 0, minWidth: '1.5rem' }}>{item.step}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.1rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{item.sub}</p>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, opacity: 0.7 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Paths ───────────────────────────── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>Your call</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
              Three ways to use it.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
            {/* Hosted */}
            <div className="three-path-card" style={{ '--path-color': 'var(--accent)' } as React.CSSProperties}>
              <div className="path-icon" style={{ '--path-color': 'var(--accent)' } as React.CSSProperties}>
                <DiscordIcon size={20} />
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Hosted · Zero setup</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', lineHeight: 1.25 }}>Add it. It works.</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem', flex: 1 }}>
                The hosted instance is run by goot27 and always online. Invite Chopsticks, get 60+ commands instantly. No accounts, no config, no infrastructure.
              </p>
              <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '0.65rem 1.25rem', width: '100%', justifyContent: 'center' }}>
                <DiscordIcon size={14} />
                Add to Discord
              </a>
            </div>

            {/* Theme */}
            <div className="three-path-card" style={{ '--path-color': '#a78bfa' } as React.CSSProperties}>
              <div className="path-icon" style={{ '--path-color': '#a78bfa' } as React.CSSProperties}>
                <PaletteIcon size={20} />
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a78bfa', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>In-server · No code</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', lineHeight: 1.25 }}>Customize with /theme.</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem', flex: 1 }}>
                Change embed colors, rename the bot's persona, disable modules you don't need — all from inside Discord. Per-server. No code, no forks required.
              </p>
              <a href="/docs#per-server" className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.65rem 1.25rem', width: '100%', justifyContent: 'center' }}>
                View /theme docs <ArrowRightIcon size={13} />
              </a>
            </div>

            {/* Self-host */}
            <div className="three-path-card" style={{ '--path-color': 'var(--green)' } as React.CSSProperties}>
              <div className="path-icon" style={{ '--path-color': 'var(--green)' } as React.CSSProperties}>
                <ServerIcon size={20} />
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Self-host · Full control</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', lineHeight: 1.25 }}>Run your own instance.</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem', flex: 1 }}>
                Full Docker stack — PostgreSQL, Redis, Lavalink. Your infra, your uptime, your rules. Need help getting started? We've got you.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href="/self-host" className="btn btn-green" style={{ fontSize: '0.82rem', padding: '0.65rem 1.25rem', flex: 1, justifyContent: 'center' }}>
                  <DockerIcon size={14} />
                  Self-host guide
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ────────────────────────────── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>Everything included</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
              One bot.<br />Seven categories.
            </h2>
          </div>
          <div className="bento" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {CATEGORIES.map((cat, i) => (
              <div key={cat.name} className={`bento-card ${cat.cls} ${i < 3 ? 'bento-lg' : ''}`} style={i < 3 ? { gridColumn: 'span 1' } : {}}>
                <span className="bento-count">{cat.count} cmds</span>
                <div className="bento-icon">
                  <cat.Icon size={22} />
                </div>
                <div className="bento-title">{cat.name}</div>
                <div className="bento-desc">{cat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Command examples ──────────────────────── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>Real commands</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              See it in action.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {[
              { cmd: '/ban', arg: '@user Spamming', color: '#fb923c', title: 'Moderation that holds up.', desc: 'One command. Banned, logged, case recorded. Hierarchy-safe — can never act above your own rank.', output: 'Banned @spammer123. Reason: Spamming. Case #47 logged.' },
              { cmd: '/trivia', arg: 'category: Science', color: '#a78bfa', title: 'Keeps your server active.', desc: 'PvP trivia, fleet battles, riddles, battles. Always something happening.', output: 'Science: What is the chemical symbol for Gold? (30s to answer)' },
              { cmd: '/autorole', arg: 'add @Member', color: '#facc15', title: 'Automation that runs itself.', desc: 'New member joins, gets @Member automatically. Configure once, runs forever.', output: 'Auto-role set. New members will receive @Member on join.' },
            ].map(item => (
              <div key={item.cmd} className="cmd-card">
                <div style={{ background: '#0d0d0d', borderBottom: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: item.color, fontWeight: 600 }}>{item.cmd}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-faint)' }}>{item.arg}</span>
                </div>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: '#080808' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#000', flexShrink: 0 }}>CH</div>
                    <div style={{ fontSize: '0.78rem', color: '#b5bac1', lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>{item.output}</div>
                  </div>
                </div>
                <div style={{ padding: '1.25rem 1rem' }}>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.4rem', fontFamily: 'var(--font-heading)' }}>{item.title}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <a href="/commands" className="btn btn-ghost" style={{ padding: '0.75rem 1.75rem' }}>
              Browse all 60+ commands <ArrowRightIcon size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── Community ─────────────────────────────── */}
      <section style={{ padding: '5rem 0', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ marginBottom: '2.5rem' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)', fontFamily: 'var(--font-heading)', marginBottom: '0.75rem' }}>Open source</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
              Built by the community,<br />for the community.
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.75, maxWidth: '520px', marginTop: '1rem' }}>
              Chopsticks is open source and community-driven. Every feature, bug fix, and improvement comes from people like you. Star the repo, open an issue, or submit a PR.
            </p>
          </div>

          {/* Star strip */}
          <div className="star-strip" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <GitHubIcon size={18} style={{ color: 'var(--text-muted)' } as React.CSSProperties} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>WokSpec / Chopsticks</span>
            </div>
            <span style={{ color: 'var(--border-strong)', fontSize: '0.8rem' }}>·</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-faint)' }}>If Chopsticks has been useful to you, a star goes a long way.</span>
            <div style={{ marginLeft: 'auto' }}>
              <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', gap: '0.4rem' }}>
                <StarIcon size={13} />
                Star on GitHub
              </a>
            </div>
          </div>

          <div className="community-grid">
            {[
              { href: GITHUB + '/issues', Icon: GitPullRequestIcon, label: 'Open an issue', desc: 'Found a bug or have a feature idea? Open an issue and let the community know.' },
              { href: GITHUB + '/pulls', Icon: GitHubIcon, label: 'Submit a PR', desc: 'Contributions of all sizes are welcome. Check CONTRIBUTING.md first.' },
              { href: '/tutorials', Icon: BookOpenIcon, label: 'Read the tutorials', desc: 'New here? The tutorials page covers everything from setup to self-hosting.' },
            ].map(item => (
              <a key={item.label} href={item.href} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined} className="community-card">
                <div className="community-card-icon">
                  <item.Icon size={18} />
                </div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{item.label}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{item.desc}</p>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--accent)' }}>
                  <span>Go</span><ArrowRightIcon size={12} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────── */}
      <section style={{ padding: '6rem 0', background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(56,189,248,0.08) 0%, rgba(139,92,246,0.05) 50%, transparent 100%), var(--bg)', borderTop: '1px solid rgba(56,189,248,0.1)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="badge" style={{ marginBottom: '1.5rem', marginLeft: 'auto', marginRight: 'auto', width: 'fit-content' }}>
            <span className="dot-live" />
            Ready to add
          </div>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.045em', color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', lineHeight: 1.05 }}>
            No setup.<br /><span className="gradient-text">Just add it.</span>
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2.25rem', maxWidth: '360px', margin: '0 auto 2.25rem' }}>
            Hosted by goot27. Free forever. 60+ commands ready the moment it joins.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.95rem 2.25rem', fontSize: '0.95rem' }}>
              <DiscordIcon size={16} />
              Add Chopsticks to Discord
            </a>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: '0.95rem 1.75rem', fontSize: '0.95rem' }}>
              <GitHubIcon size={15} />
              View source
            </a>
            <a href="/self-host" className="btn btn-ghost" style={{ padding: '0.95rem 1.75rem', fontSize: '0.95rem' }}>
              Self-host <ArrowRightIcon size={14} />
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
