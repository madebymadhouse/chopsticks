// src/commands/wouldyourather.js
// /wouldyourather — Two-choice poll question with reactions

import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { withTimeout } from '../utils/interactionTimeout.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const WYR_QUESTIONS = require('../fun/wyr.json');

export const meta = {
  deployGlobal: false,
  name: 'wouldyourather',
  description: 'Would you rather question',
  category: "entertainment",
};

export const data = new SlashCommandBuilder()
  .setName('wouldyourather')
  .setDescription('🤔 Would you rather…? Vote with reactions!');

export async function execute(interaction) {
  await interaction.deferReply();
  await withTimeout(interaction, async () => {
    const [optA, optB] = WYR_QUESTIONS[Math.floor(Math.random() * WYR_QUESTIONS.length)];

    const embed = new EmbedBuilder()
      .setTitle('🤔 Would You Rather…?')
      .setColor(Colors.Purple)
      .setDescription([
        `**🅰️ ${optA}**`,
        '',
        `**🅱️ ${optB}**`,
        '',
        'React with 🅰️ or 🅱️ to cast your vote!',
      ].join('\n'))
      .setFooter({ text: 'Results are purely for fun 😄' });

    const msg = await interaction.editReply({ embeds: [embed], fetchReply: true });
    await msg.react('🅰️').catch(() => {});
    await msg.react('🅱️').catch(() => {});
  }, { label: 'wouldyourather' });
}
