import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header, Footer } from './layout-components';
import CursorTracker from './cursor';
import { EralCompanion } from '../../components/EralCompanion';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: 'Chopsticks', template: '%s — Chopsticks' },
  description: 'A full-featured Discord bot with 162 prefix commands — music, moderation, economy, AI, games, leveling,  and more. Free, open source, and self-hostable.',
  metadataBase: new URL('https://chopsticks.madebymadhouse.org'),
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'Chopsticks',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Chopsticks — Open Source Discord Bot' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
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
        <CursorTracker />
        <Header />
        <main id="main-content">{children}</main>
        <Footer />
        <EralCompanion />
      </body>
    </html>
  );
}
