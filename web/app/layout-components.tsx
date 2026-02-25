'use client';
import Link from 'next/link';
import { DiscordIcon, GitHubIcon, ExternalLinkIcon } from './icons';

const BOT_INVITE = 'https://discord.com/api/oauth2/authorize?client_id=1466382874587431036&permissions=1099514858544&scope=bot%20applications.commands';
const GITHUB = 'https://github.com/WokSpec/Chopsticks';

export function Header() {
  return (
    <header>
      <div className="header-inner">
        <Link href="/" className="header-logo">
          <div className="header-logo-mark">CH</div>
          Chopsticks
        </Link>

        <nav>
          <Link href="/features" className="nav-link">Features</Link>
          <Link href="/commands" className="nav-link">Commands</Link>
          <Link href="/tutorials" className="nav-link">Tutorials</Link>
          <Link href="/docs" className="nav-link">Docs</Link>
          <Link href="/self-host" className="nav-link">Self-host</Link>
          <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="nav-link">
            <GitHubIcon size={14} className="nav-link-icon" />
            GitHub
          </a>
        </nav>

        <div className="header-actions">
          <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.82rem' }}>
            <DiscordIcon size={14} />
            Add to Discord
          </a>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.125rem' }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #38bdf8, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 800, color: '#03111e' }}>CH</div>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>Chopsticks</span>
            </div>
            <p>An open source Discord bot built by goot27 and the WokSpec community. Free to use, free to host.</p>
          </div>

          <div className="footer-col">
            <h4>Bot</h4>
            <Link href="/features">Features</Link>
            <Link href="/commands">Commands</Link>
            <Link href="/tutorials">Tutorials</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/self-host">Self-host</Link>
          </div>

          <div className="footer-col">
            <h4>Project</h4>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href={GITHUB + '/issues'} target="_blank" rel="noopener noreferrer">Issues</a>
            <a href={GITHUB + '/pulls'} target="_blank" rel="noopener noreferrer">Pull Requests</a>
            <a href={GITHUB + '/discussions'} target="_blank" rel="noopener noreferrer">Discussions</a>
          </div>

          <div className="footer-col">
            <h4>Community</h4>
            <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer">Add to Discord</a>
            <a href={GITHUB + '/stargazers'} target="_blank" rel="noopener noreferrer">Star on GitHub</a>
            <a href={GITHUB + '/blob/main/CONTRIBUTING.md'} target="_blank" rel="noopener noreferrer">Contribute</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Built by <a href="https://github.com/goot27" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>goot27</a> &amp; Wok Specialists · {new Date().getFullYear()}</p>
          <div className="footer-social">
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" title="GitHub">
              <GitHubIcon size={15} />
            </a>
            <a href={BOT_INVITE} target="_blank" rel="noopener noreferrer" title="Discord">
              <DiscordIcon size={15} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
