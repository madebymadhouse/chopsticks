// src/commands/marry.js
// Marriage / relationship system — cross-guild bonds stored in a shared file.
// /marry @user — propose; target clicks Accept button
// /divorce — end the marriage
// /relationship [@user] — view relationship status

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";

export const meta = {
  deployGlobal: false,
  name: "marry",
  category: "social",
};

const DB_PATH = path.join(process.cwd(), "data", "marriages.json");

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {}
  return {};
}

function saveDb(db) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export function getSpouse(userId) {
  const db = loadDb();
  return db[userId] ?? null; // { spouseId, marriedAt }
}

export const data = new SlashCommandBuilder()
  .setName("marry")
  .setDescription("Propose, manage, or view your marriage")
  .addSubcommand(s => s
    .setName("propose")
    .setDescription("Propose to someone")
    .addUserOption(o => o.setName("user").setDescription("Who to propose to").setRequired(true)))
  .addSubcommand(s => s
    .setName("divorce")
    .setDescription("End your marriage"))
  .addSubcommand(s => s
    .setName("status")
    .setDescription("View your or someone else's relationship status")
    .addUserOption(o => o.setName("user").setDescription("User to check (defaults to you)")));

// Pending proposals: Map<"proposerId:targetId", timeoutHandle>
const pendingProposals = new Map();

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const proposerId = interaction.user.id;

  if (sub === "propose") {
    const target = interaction.options.getUser("user", true);
    if (target.id === proposerId) return interaction.reply({ content: "> You can't marry yourself.", flags: MessageFlags.Ephemeral });
    if (target.bot) return interaction.reply({ content: "> You can't marry a bot.", flags: MessageFlags.Ephemeral });

    const db = loadDb();
    if (db[proposerId]) {
      return interaction.reply({ content: `> You're already married to <@${db[proposerId].spouseId}>. Use \`/marry divorce\` first.`, flags: MessageFlags.Ephemeral });
    }
    if (db[target.id]) {
      return interaction.reply({ content: `> <@${target.id}> is already married.`, flags: MessageFlags.Ephemeral });
    }

    const key = `${proposerId}:${target.id}`;
    if (pendingProposals.has(key)) return interaction.reply({ content: "> You already have a pending proposal to that user.", flags: MessageFlags.Ephemeral });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`chopsticks:marry:accept:${proposerId}:${target.id}`).setLabel("💍 Accept").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`chopsticks:marry:decline:${proposerId}:${target.id}`).setLabel("Decline").setStyle(ButtonStyle.Danger),
    );

    const embed = new EmbedBuilder()
      .setTitle("💍 Marriage Proposal")
      .setDescription(`<@${proposerId}> has proposed to <@${target.id}>!\n\n<@${target.id}>, do you accept?`)
      .setColor(0xFF73FA)
      .setFooter({ text: "This proposal expires in 60 seconds." });

    await interaction.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });

    const timeout = setTimeout(async () => {
      pendingProposals.delete(key);
      await interaction.editReply({ embeds: [embed.setFooter({ text: "Proposal expired." }).setColor(0x99AAB5)], components: [] }).catch(() => null);
    }, 60_000);
    pendingProposals.set(key, timeout);
    return;
  }

  if (sub === "divorce") {
    const db = loadDb();
    if (!db[proposerId]) return interaction.reply({ content: "> You're not married.", flags: MessageFlags.Ephemeral });
    const spouseId = db[proposerId].spouseId;
    delete db[proposerId];
    delete db[spouseId];
    saveDb(db);
    return interaction.reply({ content: `> You and <@${spouseId}> are now divorced. 💔` });
  }

  if (sub === "status") {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const db = loadDb();
    const entry = db[target.id];
    if (!entry) {
      return interaction.reply({ embeds: [new EmbedBuilder().setDescription(`<@${target.id}> is **single**.`).setColor(0x99AAB5)] });
    }
    const since = `<t:${Math.floor(entry.marriedAt / 1000)}:D>`;
    const days = Math.floor((Date.now() - entry.marriedAt) / 86400000);
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle("💍 Relationship Status")
        .setDescription(`<@${target.id}> is married to <@${entry.spouseId}>`)
        .addFields(
          { name: "Married since", value: since, inline: true },
          { name: "Days together", value: String(days), inline: true },
        )
        .setColor(0xFF73FA)],
    });
  }
}

/**
 * Handle marriage accept/decline buttons. Called from index.js button handler.
 */
export async function handleMarryButton(interaction) {
  const [, , action, proposerId, targetId] = interaction.customId.split(":");

  // Only the target can respond
  if (interaction.user.id !== targetId) {
    return interaction.reply({ content: "> This proposal isn't for you.", flags: MessageFlags.Ephemeral });
  }

  const key = `${proposerId}:${targetId}`;
  const timeout = pendingProposals.get(key);
  if (timeout) { clearTimeout(timeout); pendingProposals.delete(key); }

  if (action === "decline") {
    const embed = new EmbedBuilder()
      .setDescription(`<@${targetId}> declined the proposal from <@${proposerId}>. 💔`)
      .setColor(0xED4245);
    return interaction.update({ embeds: [embed], components: [] });
  }

  // Accept
  const db = loadDb();
  if (db[proposerId] || db[targetId]) {
    return interaction.update({ embeds: [new EmbedBuilder().setDescription("One of you is already married. Proposal cancelled.").setColor(0xED4245)], components: [] });
  }
  const now = Date.now();
  db[proposerId] = { spouseId: targetId, marriedAt: now };
  db[targetId] = { spouseId: proposerId, marriedAt: now };
  saveDb(db);

  const embed = new EmbedBuilder()
    .setTitle("💍 Just Married!")
    .setDescription(`Congratulations! <@${proposerId}> and <@${targetId}> are now married! 🎉`)
    .setColor(0xFF73FA)
    .setTimestamp();
  return interaction.update({ embeds: [embed], components: [] });
}
