// src/commands/social.js
// /social roast|compliment — unified social fun commands

import { SlashCommandBuilder, EmbedBuilder, Colors } from 'discord.js';
import { generateText } from '../utils/textLlm.js';
import { checkRateLimit } from '../utils/ratelimit.js';
import { withTimeout } from '../utils/interactionTimeout.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let FALLBACK_ROASTS;
try { FALLBACK_ROASTS = require('../fun/roasts.json'); } catch { FALLBACK_ROASTS = []; }

const FALLBACK_COMPLIMENTS = [
  "They have the energy of a perfectly brewed cup of coffee — warm, uplifting, and absolutely necessary.",
  "Their brain is so vast that libraries pay them royalties.",
  "They could make a Monday morning feel like a Friday evening.",
  "If kindness were a currency, they'd be running the global economy.",
  "They solve problems so elegantly that other solutions apologize for existing.",
  "Their laugh is the human equivalent of a system restore — everything just works better afterward.",
  "They're the kind of person your future self will thank you for knowing.",
  "Talking to them is like a free upgrade — you leave feeling 2x better than when you arrived.",
  "Their code is so clean that syntax highlighters blush.",
  "They're proof that some people just make the world genuinely better by existing in it.",
];

const ROAST_PROMPTS = {
  playful: 'You are a witty comedian. Write a short, funny, PLAYFUL roast (2-3 sentences). Keep it light and fun, not genuinely mean. No slurs, no profanity.',
  hard: 'You are a savage comedian. Write a sharp, clever roast (2-3 sentences). Keep it creative and punchy. No slurs, no profanity.',
  nerdy: 'You are a nerdy comedian. Write a roast using science, tech, and pop culture references (2-3 sentences). Be witty and clever.',
  rap: 'You are a battle rapper. Write a short rap verse roasting the target (4 lines, rhyming). Keep it clever and fun, no slurs.',
};

const COMPLIMENT_PROMPTS = {
  genuine: 'You are a thoughtful friend. Write a short, sincere, warm compliment (2-3 sentences). Make it feel personal and genuine.',
  dramatic: 'You are a Shakespearean herald. Write an absolutely over-the-top, hilariously dramatic compliment (2-3 sentences). Go big.',
  nerdy: 'You are a nerdy admirer. Write a compliment using science, tech, and pop culture references (2-3 sentences).',
  rap: 'You are a hype rapper. Write a short rap verse hyping up the target (4 lines, rhyming). Make them feel legendary.',
};

export const meta = {
  category: 'fun',
  guildOnly: false,
};

export const data = new SlashCommandBuilder()
  .setName('social')
  .setDescription('Fun social interactions — roast or compliment someone with AI')
  .addSubcommand(sub =>
    sub.setName('roast')
      .setDescription('🔥 Roast someone with AI (keep it fun, not mean!)')
      .addUserOption(o => o.setName('target').setDescription('Who to roast (default: yourself)').setRequired(false))
      .addStringOption(o => o.setName('vibe').setDescription('Roast style').setRequired(false)
        .addChoices(
          { name: '😂 Playful', value: 'playful' },
          { name: '🥊 Hard', value: 'hard' },
          { name: '🤓 Nerdy', value: 'nerdy' },
          { name: '🎤 Rap battle style', value: 'rap' },
        )))
  .addSubcommand(sub =>
    sub.setName('compliment')
      .setDescription('💐 Compliment someone with AI')
      .addUserOption(o => o.setName('target').setDescription('Who to compliment (default: yourself)').setRequired(false))
      .addStringOption(o => o.setName('style').setDescription('Compliment style').setRequired(false)
        .addChoices(
          { name: '💛 Genuine', value: 'genuine' },
          { name: '🎭 Over-the-top', value: 'dramatic' },
          { name: '🤓 Nerdy', value: 'nerdy' },
          { name: '🎤 Rap style', value: 'rap' },
        )));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'roast') return handleRoast(interaction);
  if (sub === 'compliment') return handleCompliment(interaction);
  await interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
}

// ── Roast ─────────────────────────────────────────────────────────────────────

const _roastLastPicked = new Map();
function pickFallback(userId) {
  if (!FALLBACK_ROASTS.length) return "You're so unique the universe hasn't figured out how to roast you yet.";
  const seen = _roastLastPicked.get(userId) || new Set();
  const available = FALLBACK_ROASTS.map((_, i) => i).filter(i => !seen.has(i));
  const pool = available.length > 0 ? available : Array.from({ length: FALLBACK_ROASTS.length }, (_, i) => i);
  const idx = pool[Math.floor(Math.random() * pool.length)];
  if (seen.size >= 20) seen.clear();
  seen.add(idx);
  _roastLastPicked.set(userId, seen);
  return String(FALLBACK_ROASTS[idx]?.text || FALLBACK_ROASTS[idx] || '');
}

async function handleRoast(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const vibe = interaction.options.getString('vibe') || 'playful';
  const isSelf = target.id === interaction.user.id;

  const rl = await checkRateLimit(`roast:${interaction.user.id}`, 1, 60).catch(() => ({ ok: true }));
  if (!rl.ok) {
    const remaining = Math.ceil(rl.retryAfter || 60);
    await interaction.reply({ content: `⏳ You can roast again in **${remaining}s**.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();
  await withTimeout(interaction, async () => {
    const targetName = target.displayName || target.username;
    const prompt = `Write a ${vibe} roast for a Discord user named "${targetName}". Keep it under 3 sentences.`;
    const system = ROAST_PROMPTS[vibe] || ROAST_PROMPTS.playful;

    let text = '';
    try { text = await generateText({ prompt, system, guildId: interaction.guildId }); } catch {}
    if (!text || text.trim().length < 10) text = pickFallback(interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle(`🔥 ${isSelf ? interaction.user.username + ' roasted themselves' : interaction.user.username + ' roasted ' + targetName}`)
      .setDescription(text)
      .setColor(Colors.Orange)
      .setThumbnail(target.displayAvatarURL({ size: 64 }))
      .setFooter({ text: 'All in good fun 😄' });

    await interaction.editReply({ embeds: [embed] });
  }, { label: 'social' });
}

// ── Compliment ────────────────────────────────────────────────────────────────

async function handleCompliment(interaction) {
  const target = interaction.options.getUser('target') || interaction.user;
  const style = interaction.options.getString('style') || 'genuine';
  const isSelf = target.id === interaction.user.id;

  const rl = await checkRateLimit(`compliment:${interaction.user.id}`, 1, 30).catch(() => ({ ok: true }));
  if (!rl.ok) {
    const remaining = Math.ceil(rl.retryAfter || 30);
    await interaction.reply({ content: `⏳ You can compliment again in **${remaining}s**.`, ephemeral: true });
    return;
  }

  await interaction.deferReply();
  await withTimeout(interaction, async () => {
    const targetName = target.displayName || target.username;
    const prompt = `Write a ${style} compliment for a Discord user named "${targetName}". Keep it under 3 sentences.`;
    const system = COMPLIMENT_PROMPTS[style] || COMPLIMENT_PROMPTS.genuine;

    let text = '';
    try { text = await generateText({ prompt, system, guildId: interaction.guildId }); } catch {}
    if (!text || text.trim().length < 10) {
      text = FALLBACK_COMPLIMENTS[Math.floor(Math.random() * FALLBACK_COMPLIMENTS.length)];
    }

    const embed = new EmbedBuilder()
      .setTitle(`💐 ${isSelf ? interaction.user.username + ' appreciated themselves' : interaction.user.username + ' complimented ' + targetName}`)
      .setDescription(text)
      .setColor(Colors.Gold)
      .setThumbnail(target.displayAvatarURL({ size: 64 }))
      .setFooter({ text: 'Spread good vibes 💛' });

    await interaction.editReply({ embeds: [embed] });
  }, { label: 'social' });
}
