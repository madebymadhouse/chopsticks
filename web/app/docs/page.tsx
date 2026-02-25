import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Docs',
  description: 'Complete documentation for Chopsticks — quickstart, self-hosting, Docker setup, branding/reskin guide, Agent Pool, and more.',
};

const CODE_BLOCK_STYLE: React.CSSProperties = {
  background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem',
  padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
  color: '#e2e8f0', lineHeight: 1.75, overflowX: 'auto', whiteSpace: 'pre',
  marginTop: '0.75rem', marginBottom: '0.75rem',
};

const SECTION_STYLE: React.CSSProperties = {
  borderBottom: '1px solid var(--border)', paddingBottom: '2.5rem', marginBottom: '2.5rem',
};

const H2_STYLE: React.CSSProperties = {
  fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.875rem',
  fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
};

const P_STYLE: React.CSSProperties = {
  fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '0.75rem',
};

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.82em',
      background: 'rgba(255,255,255,0.07)', padding: '0.1em 0.4em',
      borderRadius: '0.25rem', color: 'var(--accent)',
    }}>{children}</code>
  );
}

function TableRow({ cells, head }: { cells: string[]; head?: boolean }) {
  const Tag = head ? 'th' : 'td';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {cells.map((c, i) => (
        <Tag key={i} style={{
          padding: '0.6rem 0.875rem', fontSize: '0.83rem',
          color: head ? 'var(--text-faint)' : 'var(--text-muted)',
          fontWeight: head ? 700 : 400, textAlign: 'left',
          fontFamily: head ? 'var(--font-heading)' : 'var(--font-body)',
          letterSpacing: head ? '0.06em' : undefined,
          textTransform: head ? 'uppercase' : undefined,
        }}>{c}</Tag>
      ))}
    </tr>
  );
}

export default function DocsPage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ borderBottom: '1px solid var(--border)', padding: '4rem 0 3rem', background: 'var(--surface)' }}>
        <div className="container">
          <div className="badge" style={{ marginBottom: '1.25rem' }}>Documentation</div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: '0.75rem', fontFamily: 'var(--font-heading)' }}>
            Chopsticks Docs
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.7 }}>
            Use the hosted instance, reskin it to match your brand, or self-host your own. Everything you need is here.
          </p>
        </div>
      </section>

      <div className="container docs-grid" style={{ padding: '3.5rem 1.5rem', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '3rem', maxWidth: '1000px', alignItems: 'start' }}>

        {/* Sidebar nav */}
        <nav style={{ position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {[
            { id: 'overview',       label: 'Overview' },
            { id: 'hosted',         label: 'Hosted quickstart' },
            { id: 'self-host',      label: 'Self-hosting' },
            { id: 'reskin',         label: 'Reskinning' },
            { id: 'per-server',     label: 'Per-server themes' },
            { id: 'feature-flags',  label: 'Feature flags' },
            { id: 'agent-pool',     label: 'Agent Pool' },
            { id: 'contributing',   label: 'Contributing' },
          ].map(item => (
            <a key={item.id} href={`#${item.id}`} className="docs-nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        {/* Content */}
        <div>

          {/* Overview */}
          <section id="overview" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Overview</h2>
            <p style={P_STYLE}>
              Chopsticks is a full-featured Discord bot built by{' '}
              <a href="https://github.com/goot27" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>goot27</a> and{' '}
              <a href="https://wokspec.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Wok Specialists</a>.
              It ships 60 slash commands across music, moderation, economy, games, AI, and utility — plus the Agent Pool system for community-powered voice deployments.
            </p>
            <p style={P_STYLE}>
              It&apos;s open source (MIT), free forever, and built on discord.js v14 with PostgreSQL, Redis, and Lavalink.
              You can use the hosted instance immediately, fork and reskin it for your brand, or self-host a full Docker stack.
            </p>
          </section>

          {/* Hosted quickstart */}
          <section id="hosted" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Hosted quickstart</h2>
            <p style={P_STYLE}>
              The easiest path. The hosted instance is run by goot27 — no accounts, no servers, no config required.
            </p>
            <ol style={{ paddingLeft: '1.5rem', ...P_STYLE }}>
              <li style={{ marginBottom: '0.5rem' }}>Click <strong>Add to Discord</strong> and authorize the bot with your server.</li>
              <li style={{ marginBottom: '0.5rem' }}>Use <InlineCode>/setup</InlineCode> to configure modules (optional).</li>
              <li>Start using commands — try <InlineCode>/help</InlineCode> for a full list.</li>
            </ol>
            <div style={{ marginTop: '1.25rem' }}>
              <a
                href="https://discord.com/api/oauth2/authorize?client_id=1466382874587431036&permissions=1099514858544&scope=bot%20applications.commands"
                target="_blank" rel="noopener noreferrer"
                className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.65rem 1.5rem' }}
              >
                Add Chopsticks to Discord →
              </a>
            </div>
          </section>

          {/* Self-hosting */}
          <section id="self-host" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Self-hosting</h2>
            <p style={P_STYLE}>Run your own Chopsticks instance. Everything is containerized — you need Docker, a Discord bot token, and nothing else to start.</p>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem', marginTop: '1.25rem' }}>Prerequisites</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <thead style={{ background: 'var(--surface)' }}>
                  <TableRow cells={['Requirement', 'Version']} head />
                </thead>
                <tbody>
                  {[
                    ['Node.js', '20 or 22 LTS'],
                    ['Docker + Compose', 'v2+'],
                    ['PostgreSQL', '15+ (or use Docker)'],
                    ['Redis', '7+ (or use Docker)'],
                    ['Lavalink', 'Latest (music only)'],
                  ].map(row => <TableRow key={row[0]} cells={row} />)}
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Quick start (Docker)</h3>
            <div style={CODE_BLOCK_STYLE}>{`git clone https://github.com/WokSpec/Chopsticks.git
cd Chopsticks
cp .env.example .env
# Fill in DISCORD_TOKEN, CLIENT_ID, BOT_OWNER_IDS at minimum
docker compose -f docker-compose.free.yml up -d`}</div>
            <p style={{ ...P_STYLE, marginTop: '0.75rem' }}>
              Use <InlineCode>docker-compose.free.yml</InlineCode> for a minimal free-tier stack.
              Use <InlineCode>docker-compose.production.yml</InlineCode> for a hardened production deployment.
              See <a href="/self-host" style={{ color: 'var(--accent)', textDecoration: 'none' }}>the full self-hosting guide</a> for all options.
            </p>
          </section>

          {/* Reskinning */}
          <section id="reskin" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Reskinning (fork &amp; rebrand)</h2>
            <p style={P_STYLE}>
              All brand text, colors, and feature flags are controlled by <InlineCode>src/config/branding.js</InlineCode>.
              Fork the repo, edit that file, and you have a fully rebranded bot.
            </p>
            <div style={CODE_BLOCK_STYLE}>{`// src/config/branding.js
export const Branding = {
  name:          "MyBot",
  tagline:       "My custom Discord bot",
  supportServer: "https://discord.gg/myserver",
  website:       "https://mybot.example.com",
  github:        "https://github.com/yourname/mybot",
  footerText:    "{botname} • mybot.example.com",

  colors: {
    primary: 0xFF5733,   // your brand color
    success: 0x57F287,
    error:   0xED4245,
    music:   0x1DB954,
  },
};`}</div>
            <p style={P_STYLE}>
              Every field also has an environment variable equivalent — so you can rebrand via <InlineCode>.env</InlineCode> with no code edits at all:
            </p>
            <div style={CODE_BLOCK_STYLE}>{`BOT_NAME=MyBot
BOT_TAGLINE=My custom Discord bot
COLOR_PRIMARY=16734003
FEATURE_ECONOMY=false`}</div>
          </section>

          {/* Per-server themes */}
          <section id="per-server" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Per-server customization</h2>
            <p style={{ ...P_STYLE }}>
              No fork needed. Server admins can customize how Chopsticks looks and behaves in their own server using the <InlineCode>/theme</InlineCode> command:
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <thead style={{ background: 'var(--surface)' }}>
                  <TableRow cells={['Command', 'Effect']} head />
                </thead>
                <tbody>
                  {[
                    ['/theme color primary #FF5733', 'Change the primary embed color'],
                    ['/theme name MyBot', 'Rename the bot persona for this server'],
                    ['/theme footer "Powered by MyBot"', 'Set a custom embed footer'],
                    ['/theme feature economy disable', 'Disable the economy module in this server'],
                    ['/theme preview', 'Show current server theme'],
                    ['/theme reset', 'Reset all customizations to defaults'],
                  ].map(row => <TableRow key={row[0]} cells={row} />)}
                </tbody>
              </table>
            </div>
          </section>

          {/* Feature flags */}
          <section id="feature-flags" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Feature flags</h2>
            <p style={P_STYLE}>
              Toggle entire modules on or off globally (via <InlineCode>branding.js</InlineCode> or <InlineCode>.env</InlineCode>) or per-server (via <InlineCode>/theme feature</InlineCode>):
            </p>
            <div style={CODE_BLOCK_STYLE}>{`// branding.js features block
features: {
  economy:       true,
  music:         true,
  ai:            true,
  leveling:      true,
  voicemaster:   true,
  tickets:       true,
  moderation:    true,
  fun:           true,
  social:        true,
  notifications: true,
}`}</div>
            <p style={{ ...P_STYLE, marginTop: '0.75rem' }}>
              Or via env vars: <InlineCode>FEATURE_ECONOMY=false</InlineCode>, <InlineCode>FEATURE_MUSIC=false</InlineCode>, etc.
            </p>
          </section>

          {/* Agent Pool */}
          <section id="agent-pool" style={SECTION_STYLE}>
            <h2 style={H2_STYLE}>Agent Pool system</h2>
            <p style={P_STYLE}>
              The Agent Pool is Chopsticks&apos; flagship feature. Multiple bot tokens are pooled, encrypted, and dispatched to voice channels on demand.
              Servers never manage tokens — they spend server credits to request an agent.
            </p>
            <p style={P_STYLE}>
              Server admins configure available agent actions and their credit costs via <InlineCode>/setup agent-pool</InlineCode>.
              Available actions include: joining a voice channel, playing audio, running trivia, sending a message, or running an AI assistant.
            </p>
            <p style={{ ...P_STYLE, marginBottom: 0 }}>
              Agents are contributed by the community — anyone can add a token to the pool via the dashboard.
              The pool dispatcher handles load balancing and ensures no single agent is overloaded.
            </p>
          </section>

          {/* Contributing */}
          <section id="contributing" style={{ ...SECTION_STYLE, borderBottom: 'none', marginBottom: 0 }}>
            <h2 style={H2_STYLE}>Contributing</h2>
            <p style={P_STYLE}>
              Chopsticks is open source under a modified MIT license. Bug reports, feature requests, and pull requests are all welcome.
            </p>
            <p style={P_STYLE}>
              See <InlineCode>CONTRIBUTING.md</InlineCode> in the repository for the contribution guide, code standards, and how to submit a PR.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
              <a href="https://github.com/WokSpec/Chopsticks" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>
                View on GitHub →
              </a>
              <a href="https://github.com/WokSpec/Chopsticks/issues" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>
                Open an issue →
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
