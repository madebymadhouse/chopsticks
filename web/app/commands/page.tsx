import type { Metadata } from 'next';
import CommandsClient from './client';

export const metadata: Metadata = {
  title: 'Commands',
  description: 'Browse all 168+ Chopsticks Discord bot commands — music, moderation, economy, games, AI agents, and more.',
};

export default function CommandsPage() {
  return <CommandsClient />;
}
