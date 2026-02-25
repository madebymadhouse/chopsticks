import type { Metadata } from 'next';
import './globals.css';
import { Header, Footer } from './layout-components';

export const metadata: Metadata = {
  title: { default: 'Chopsticks', template: '%s — Chopsticks' },
  description: 'A full-featured Discord bot with 60+ commands — music, moderation, economy, games, AI agents, and more. Free, open source, and self-hostable.',
  metadataBase: new URL('https://chopsticks.wokspec.org'),
  openGraph: {
    siteName: 'Chopsticks',
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
