// src/commands/ship.js
// /ship @user1 @user2 — Compatibility score with deterministic hash

import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { withTimeout } from '../utils/interactionTimeout.js';

export const meta = {
  deployGlobal: false,
  name: 'ship',
  description: 'Ship two users and get a compatibility score',
  category: 'fun',
};

export const data = new SlashCommandBuilder()
  .setName('ship')
  .setDescription('💘 Calculate the compatibility between two users')
  .addUserOption(o => o
    .setName('user1')
    .setDescription('First person')
    .setRequired(true))
  .addUserOption(o => o
    .setName('user2')
    .setDescription('Second person (default: you)')
    .setRequired(false));

const FLAVOR_TEXT = [
  [0,  19,  '💔 Not meant to be. At all. The universe said no.'],
  [20, 39,  '😬 Rough start. Maybe as friends first?'],
  [40, 54,  '🙂 There\'s potential — work on communication.'],
  [55, 69,  '😊 Pretty compatible! Things could go well.'],
  [70, 84,  '💕 Strong chemistry! You two really click.'],
  [85, 94,  '🔥 Power couple alert. Very high compatibility!'],
  [95, 100, '💍 PERFECT MATCH. Absolutely destined. A love story for the ages.'],
];

/** Deterministic hash so the same pair always gets the same score. */
function shipScore(idA, idB) {
  const [lo, hi] = [idA, idB].sort();
  let h = 5381;
  for (const c of `${lo}:${hi}`) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0;
  return h % 101; // 0–100
}

function getHearts(score) {
  const filled = Math.round(score / 10);
  return '❤️'.repeat(filled) + '🖤'.repeat(10 - filled);
}

export async function execute(interaction) {
  const user1 = interaction.options.getUser('user1');
  const user2 = interaction.options.getUser('user2') || interaction.user;

  if (user1.id === user2.id) {
    await interaction.reply({ content: '💭 You can\'t ship someone with themselves… or can you? (Try two different users!)', ephemeral: true });
    return;
  }

  await interaction.deferReply();
  await withTimeout(interaction, async () => {
    const score = shipScore(user1.id, user2.id);
    const [, , flavor] = FLAVOR_TEXT.find(([min, max]) => score >= min && score <= max);
    const bar = `${getHearts(score)} **${score}%**`;

    const embed = new EmbedBuilder()
      .setTitle('💘 Ship-O-Meter')
      .setColor(score >= 70 ? Colors.Pink : score >= 40 ? Colors.Yellow : Colors.DarkRed)
      .setDescription([
        `**${user1.username}** 💞 **${user2.username}**`,
        '',
        bar,
        '',
        flavor,
      ].join('\n'))
      .setFooter({ text: 'Science™ certified | Results are for entertainment only' });

    await interaction.editReply({ embeds: [embed] });
  }, { label: 'ship' });
}
