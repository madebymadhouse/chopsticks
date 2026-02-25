import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Self-Host',
  description: 'Run your own Chopsticks instance. Full Docker stack — PostgreSQL, Redis, and Lavalink included. Fork, rebrand, and own it completely.',
};

const CODE_BLOCK_STYLE: React.CSSProperties = {
  background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem',
  padding: '1rem 1.25rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
  color: '#e2e8f0', lineHeight: 1.75, overflowX: 'auto', whiteSpace: 'pre',
  marginTop: '0.75rem', marginBottom: '1rem',
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

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr', gap: '1rem', marginBottom: '2rem', alignItems: 'start' }}>
      <div style={{
        width: '2.5rem', height: '2.5rem', borderRadius: '50%',
        background: 'var(--accent-dim)', border: '1px solid var(--accent-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent)', flexShrink: 0,
      }}>{n}</div>
      <div>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>{title}</p>
        {children}
      </div>
    </div>
  );
}

function TableRow({ cells, head }: { cells: string[]; head?: boolean }) {
  const Tag = head ? 'th' : 'td';
  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      {cells.map((c, i) => (
        <Tag key={i} style={{
          padding: '0.6rem 0.875rem', fontSize: '0.83rem',
          color: head ? 'var(--text-faint)' : (i === 0 ? 'var(--accent)' : 'var(--text-muted)'),
          fontWeight: head ? 700 : (i === 0 ? 600 : 400), textAlign: 'left',
          fontFamily: i === 0 && !head ? 'var(--font-mono)' : (head ? 'var(--font-heading)' : 'var(--font-body)'),
          letterSpacing: head ? '0.06em' : undefined,
          textTransform: head ? 'uppercase' : undefined,
        }}>{c}</Tag>
      ))}
    </tr>
  );
}

export default function SelfHostPage() {
  return (
    <div>
      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)', padding: '5rem 0 4rem', background: 'var(--surface)' }}>
        <div className="orb orb-blue" style={{ width: 500, height: 500, top: -200, right: -100, opacity: 0.4 }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="badge" style={{ marginBottom: '1.25rem' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80' }} />
            Self-hosting guide
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', fontWeight: 700, letterSpacing: '-0.045em', color: 'var(--text)', marginBottom: '1rem', fontFamily: 'var(--font-heading)', lineHeight: 1.05 }}>
            Run your own<br />
            <span style={{ color: '#4ade80' }}>Chopsticks.</span>
          </h1>
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', maxWidth: '480px', lineHeight: 1.75, marginBottom: '2rem' }}>
            Full Docker stack — PostgreSQL, Redis, and Lavalink included. One command and you're running. MIT licensed. Own it completely.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="https://github.com/WokSpec/Chopsticks" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', background: '#4ade80', color: '#000' }}>
              View on GitHub →
            </a>
            <a href="#quickstart" className="btn btn-ghost" style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}>
              Quickstart
            </a>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '860px' }}>

        {/* Prerequisites */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Prerequisites
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <thead style={{ background: 'var(--surface)' }}>
                <TableRow cells={['Requirement', 'Version', 'Notes']} head />
              </thead>
              <tbody>
                {[
                  ['Node.js', '20 or 22 LTS', 'Required even with Docker for deploy scripts'],
                  ['Docker + Compose', 'v2+', 'docker compose (not docker-compose)'],
                  ['PostgreSQL', '15+ (or use Docker)', 'Included in all Docker Compose profiles'],
                  ['Redis', '7+ (or use Docker)', 'Included in all Docker Compose profiles'],
                  ['Lavalink', 'Latest', 'Music playback only — skip if disabling music'],
                  ['Discord bot token', '—', 'Create at discord.com/developers'],
                ].map(row => <TableRow key={row[0]} cells={row} />)}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quickstart */}
        <section id="quickstart" style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '1.5rem' }}>
            Quickstart (Docker)
          </h2>

          <Step n={1} title="Clone the repository">
            <div style={CODE_BLOCK_STYLE}>{`git clone https://github.com/WokSpec/Chopsticks.git
cd Chopsticks`}</div>
          </Step>

          <Step n={2} title="Configure your environment">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
              Copy the example env file and fill in the required values. At minimum you need <InlineCode>DISCORD_TOKEN</InlineCode>, <InlineCode>CLIENT_ID</InlineCode>, and <InlineCode>BOT_OWNER_IDS</InlineCode>.
            </p>
            <div style={CODE_BLOCK_STYLE}>{`cp .env.example .env
# Open .env in your editor and fill in:
#   DISCORD_TOKEN=your_bot_token_here
#   CLIENT_ID=your_application_id
#   BOT_OWNER_IDS=your_discord_user_id`}</div>
          </Step>

          <Step n={3} title="Start the stack">
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '0.5rem' }}>
              Use the free-tier profile for a minimal deployment, or the production profile for a hardened setup.
            </p>
            <div style={CODE_BLOCK_STYLE}>{`# Minimal free-tier stack
docker compose -f docker-compose.free.yml up -d

# Production-hardened stack
docker compose -f docker-compose.production.yml up -d`}</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
              The bot will auto-register slash commands on first start. Check logs with <InlineCode>docker compose logs -f bot</InlineCode>.
            </p>
          </Step>
        </section>

        {/* Rebranding */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Rebranding your instance
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
            Everything needed to give Chopsticks your own brand identity lives in <InlineCode>src/config/branding.js</InlineCode>.
            No other files need to change for a full rebrand.
          </p>
          <div style={CODE_BLOCK_STYLE}>{`// src/config/branding.js
export const Branding = {
  name:          "YourBot",
  tagline:       "Your bot's tagline",
  supportServer: "https://discord.gg/yourserver",
  inviteUrl:     "https://discord.com/api/oauth2/authorize?...",
  website:       "https://yourbot.example.com",
  github:        "https://github.com/yourname/yourbot",
  footerText:    "{botname} • yourbot.example.com",

  colors: {
    primary: 0xFF5733,   // hex → decimal: parseInt('FF5733', 16)
    success: 0x57F287,
    error:   0xED4245,
    music:   0x1DB954,
  },
};`}</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.75 }}>
            Alternatively, set everything via <InlineCode>.env</InlineCode> — no code edits required:
          </p>
          <div style={CODE_BLOCK_STYLE}>{`BOT_NAME=YourBot
BOT_TAGLINE=Your bot's tagline
COLOR_PRIMARY=16734003    # decimal equivalent of hex color
FEATURE_ECONOMY=false     # disable modules you don't need`}</div>
        </section>

        {/* Per-server themes */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Per-server customization
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '1.25rem' }}>
            Server admins can customize appearance and features per-guild using <InlineCode>/theme</InlineCode> — no fork or restart needed.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <thead style={{ background: 'var(--surface)' }}>
                <TableRow cells={['Command', 'Effect']} head />
              </thead>
              <tbody>
                {[
                  ['/theme color primary #FF5733', 'Change the primary embed color for this server'],
                  ['/theme color success #00FF00', 'Change success embed color'],
                  ['/theme name MyBot', 'Rename the bot persona in this server'],
                  ['/theme footer "Powered by MyBot"', 'Set a custom embed footer'],
                  ['/theme feature economy disable', 'Disable the economy module in this server'],
                  ['/theme preview', 'Preview current server theme'],
                  ['/theme reset', 'Reset all customizations to bot defaults'],
                ].map(row => <TableRow key={row[0]} cells={row} />)}
              </tbody>
            </table>
          </div>
        </section>

        {/* Feature flags */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Feature flags
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.75, marginBottom: '1rem' }}>
            Toggle entire modules on or off. Useful if you want a music-only bot, a moderation-only bot, etc.
          </p>
          <div style={CODE_BLOCK_STYLE}>{`# .env — disable modules globally
FEATURE_ECONOMY=false
FEATURE_MUSIC=false
FEATURE_AI=false
FEATURE_LEVELING=false`}</div>
        </section>

        {/* Docker compose profiles */}
        <section style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Docker Compose profiles
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <thead style={{ background: 'var(--surface)' }}>
                <TableRow cells={['File', 'Use case']} head />
              </thead>
              <tbody>
                {[
                  ['docker-compose.free.yml', 'Minimal free-tier stack — bot + DB + Redis'],
                  ['docker-compose.production.yml', 'Hardened production with secrets management'],
                  ['docker-compose.lavalink.yml', 'Adds Lavalink for music support'],
                  ['docker-compose.monitoring.yml', 'Adds Prometheus + Grafana monitoring'],
                  ['docker-compose.voice.yml', 'Voice-focused stack with agent pool support'],
                  ['docker-compose.laptop.yml', 'Lightweight dev stack for local development'],
                ].map(row => <TableRow key={row[0]} cells={row} />)}
              </tbody>
            </table>
          </div>
        </section>

        {/* Links */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.875rem', padding: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.25rem' }}>Need more detail?</p>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>The full <InlineCode>SELF_HOSTING.md</InlineCode> in the repo covers every config option, environment variable, and deployment scenario.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="https://github.com/WokSpec/Chopsticks/blob/main/SELF_HOSTING.md" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem', background: '#4ade80', color: '#000' }}>
              Full guide on GitHub
            </a>
            <a href="/docs" className="btn btn-ghost" style={{ fontSize: '0.85rem', padding: '0.65rem 1.25rem' }}>
              Read the docs
            </a>
          </div>
        </div>

        {/* Community help */}
        <div style={{ marginTop: '1.5rem', background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: '0.875rem', padding: '1.75rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-heading)', marginBottom: '0.25rem' }}>Need help getting set up?</p>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>Open a discussion on GitHub and the community will help. For issues with the bot itself, file a bug report. For questions about specific deployments, Discussions is the right place.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', flexShrink: 0 }}>
            <a href="https://github.com/WokSpec/Chopsticks/discussions" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.6rem 1.1rem' }}>
              GitHub Discussions
            </a>
            <a href="https://github.com/WokSpec/Chopsticks/issues" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.6rem 1.1rem' }}>
              Open an issue
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
