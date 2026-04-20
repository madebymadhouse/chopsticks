import type { Metadata } from 'next';
import CommandsClient from './client';

export const metadata: Metadata = {
  title: 'Commands',
  description: 'Browse all 101 Chopsticks Discord bot commands — music, moderation, economy, games, AI agents, and automation.',
  alternates: { canonical: 'https://chopsticks.madebymadhouse.org/commands' },
};

export default function CommandsPage() {
  return <CommandsClient />;
}
