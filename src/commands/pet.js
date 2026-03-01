// src/commands/pet.js
// /pet — companion system backed by the user_pets PostgreSQL table
import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { getUserPets, createPet, updatePetStats, deletePet } from "../utils/storage.js";
import { hasItem, removeItem } from "../economy/inventory.js";
import { Colors, replyError } from "../utils/discordOutput.js";
import { recordQuestEvent } from "../game/quests.js";
import { withTimeout } from "../utils/interactionTimeout.js";
import { sanitizeString } from "../utils/validation.js";

export const meta = {
  deployGlobal: false,
  category: "game",
  guildOnly: true,
};

// Pet type catalogue
const PET_TYPES = {
  nano_drone: {
    emoji: "🤖",
    name: "Nano Drone",
    description: "Boosts your gather luck by 15% while active.",
    unlockItem: "companion_egg_drone",
    rarity: "common",
    passiveBuff: { key: "luck:gather", value: 0.15 },
  },
  code_fox: {
    emoji: "🦊",
    name: "Code Fox",
    description: "Increases credit drops from fights by 10%.",
    unlockItem: "companion_egg_fox",
    rarity: "rare",
    passiveBuff: { key: "credits:fight", value: 0.10 },
  },
  quantum_rabbit: {
    emoji: "🐰",
    name: "Quantum Rabbit",
    description: "Reduces your /work cooldown by 20%.",
    unlockItem: "companion_egg_rabbit",
    rarity: "epic",
    passiveBuff: { key: "cd:work", value: 0.20 },
  },
  viral_cat: {
    emoji: "🐱",
    name: "Viral Cat",
    description: "Grants a 25% XP bonus on all activities.",
    unlockItem: "companion_egg_cat",
    rarity: "legendary",
    passiveBuff: { key: "xp:mult", value: 1.25 },
  },
};

const RARITY_COLORS = {
  common: Colors.INFO,
  rare: 0x4ade80,
  epic: 0xa78bfa,
  legendary: 0xfacc15,
};

// Pending release confirmations: Map<userId, { petId, petName, expiresAt }>
const pendingReleases = new Map();
const RELEASE_BTN_CONFIRM = "pet:release:confirm";
const RELEASE_BTN_CANCEL  = "pet:release:cancel";

function moodEmoji(mood) {
  return { ecstatic: "🌟", happy: "😊", content: "😐", sad: "😢", critical: "💔" }[mood] ?? "😐";
}

function hungerBar(hunger, len = 10) {
  const filled = Math.round((hunger / 100) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

function deriveMood(stats) {
  const { hunger = 100, happiness = 100 } = stats;
  const avg = (hunger + happiness) / 2;
  if (avg >= 90) return "ecstatic";
  if (avg >= 65) return "happy";
  if (avg >= 40) return "content";
  if (avg >= 20) return "sad";
  return "critical";
}

function petEmbed(pet, typeInfo) {
  const s = pet.stats ?? {};
  const mood = deriveMood(s);
  const color = RARITY_COLORS[typeInfo?.rarity] ?? Colors.INFO;
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`${typeInfo?.emoji ?? "🐾"} ${pet.name || typeInfo?.name}`)
    .setDescription(`*${typeInfo?.description ?? "Your companion."}*`)
    .addFields(
      { name: "Species", value: typeInfo?.name ?? pet.pet_type, inline: true },
      { name: "Rarity", value: (typeInfo?.rarity ?? "?").charAt(0).toUpperCase() + (typeInfo?.rarity ?? "?").slice(1), inline: true },
      { name: "Level", value: `${s.level ?? 1}`, inline: true },
      { name: `Hunger  ${hungerBar(s.hunger ?? 100)}`, value: `${s.hunger ?? 100}/100`, inline: true },
      { name: `Happiness  ${hungerBar(s.happiness ?? 100)}`, value: `${s.happiness ?? 100}/100`, inline: true },
      { name: "Mood", value: `${moodEmoji(mood)} ${mood.charAt(0).toUpperCase() + mood.slice(1)}`, inline: true },
    )
    .setFooter({ text: `ID: ${pet.id}  ·  Adopted ${new Date(pet.created_at).toLocaleDateString()}` })
    .setTimestamp();
}

export const data = new SlashCommandBuilder()
  .setName("pet")
  .setDescription("Companion system — adopt and care for your pet")
  .addSubcommand(s =>
    s.setName("view").setDescription("View your companions"))
  .addSubcommand(s =>
    s.setName("adopt")
      .setDescription("Adopt a companion (requires a companion egg from crates/shop)")
      .addStringOption(o =>
        o.setName("type")
          .setDescription("Companion type to adopt")
          .setRequired(true)
          .addChoices(...Object.entries(PET_TYPES).map(([k, v]) => ({ name: `${v.emoji} ${v.name} (${v.rarity})`, value: k }))))
      .addStringOption(o =>
        o.setName("name").setDescription("Name your companion (optional)").setMaxLength(24)))
  .addSubcommand(s =>
    s.setName("feed")
      .setDescription("Feed your companion a treat (consumes 1 Companion Treat from inventory)"))
  .addSubcommand(s =>
    s.setName("rename")
      .setDescription("Rename your companion")
      .addStringOption(o =>
        o.setName("name").setDescription("New name").setRequired(true).setMaxLength(24)))
  .addSubcommand(s =>
    s.setName("release")
      .setDescription("Release your companion (permanent)"));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  await withTimeout(interaction, async () => {
    const userId = interaction.user.id;

    if (sub === "view") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const pets = await getUserPets(userId);
      if (!pets.length) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(Colors.INFO)
            .setTitle("🐾 No Companions Yet")
            .setDescription("You haven't adopted a companion yet.\n\nUse `/pet adopt` to welcome one — companion eggs can be found in loot crates or purchased from the shop once unlocked.")],
        });
      }
      const pet = pets[0];
      const typeInfo = PET_TYPES[pet.pet_type];
      return interaction.editReply({ embeds: [petEmbed(pet, typeInfo)] });
    }

    if (sub === "adopt") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const existing = await getUserPets(userId);
      if (existing.length >= 1) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(Colors.WARNING ?? 0xfbbf24)
            .setTitle("Already Have a Companion")
            .setDescription("You can only have one companion at a time. Release your current companion first with `/pet release`.")],
        });
      }

      const type = interaction.options.getString("type", true);
      const typeInfo = PET_TYPES[type];
      if (!typeInfo) return interaction.editReply({ content: "Unknown companion type." });

      // Check for companion egg
      const hasEgg = await hasItem(userId, typeInfo.unlockItem);
      if (!hasEgg) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(Colors.ERROR ?? 0xef4444)
            .setTitle(`${typeInfo.emoji} Missing Egg`)
            .setDescription(`You need a **${typeInfo.name} Egg** to adopt this companion.\n\nEggs can be found in loot crates or purchased from the shop.`)],
        });
      }

      const rawName = interaction.options.getString("name");
      const name = rawName ? sanitizeString(rawName) : typeInfo.name;

      await removeItem(userId, typeInfo.unlockItem, 1, null);
      const pet = await createPet(userId, type, name);
      try { await recordQuestEvent(userId, "adopt_pet", 1); } catch {}

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(RARITY_COLORS[typeInfo.rarity] ?? Colors.SUCCESS)
          .setTitle(`${typeInfo.emoji} Welcome, ${name}!`)
          .setDescription(`You've adopted a **${typeInfo.name}**!\n\n*${typeInfo.description}*\n\nKeep them happy with \`/pet feed\` — use **Companion Treats** from your inventory.`)
          .setFooter({ text: `Pet ID: ${pet.id}` })],
      });
    }

    if (sub === "feed") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const pets = await getUserPets(userId);
      if (!pets.length) {
        return interaction.editReply({ content: "You don't have a companion yet. Use `/pet adopt`." });
      }

      const hasTreat = await hasItem(userId, "companion_treat");
      if (!hasTreat) {
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor(Colors.ERROR ?? 0xef4444)
            .setTitle("No Treats")
            .setDescription("You're out of **Companion Treats**. Buy some from the shop with `/shop buy companion_treat`.")],
        });
      }

      await removeItem(userId, "companion_treat", 1, null);
      const pet = pets[0];
      const s = { ...(pet.stats ?? {}) };
      s.hunger    = Math.min(100, (s.hunger    ?? 100) + 50);
      s.happiness = Math.min(100, (s.happiness ?? 100) + 25);
      const updated = await updatePetStats(pet.id, s);
      const typeInfo = PET_TYPES[pet.pet_type];

      return interaction.editReply({ embeds: [petEmbed({ ...pet, stats: updated?.stats ?? s }, typeInfo)] });
    }

    if (sub === "rename") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const pets = await getUserPets(userId);
      if (!pets.length) return interaction.editReply({ content: "You don't have a companion yet." });

      const newName = sanitizeString(interaction.options.getString("name", true));
      const pet = pets[0];
      const s = { ...(pet.stats ?? {}), name: newName };
      await updatePetStats(pet.id, s);

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(Colors.SUCCESS)
          .setDescription(`✅ Your companion is now named **${newName}**.`)],
      });
    }

    if (sub === "release") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const pets = await getUserPets(userId);
      if (!pets.length) return interaction.editReply({ content: "You don't have a companion to release." });

      const pet = pets[0];
      const typeInfo = PET_TYPES[pet.pet_type];

      pendingReleases.set(userId, { petId: pet.id, petName: pet.name || typeInfo?.name, expiresAt: Date.now() + 30_000 });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(RELEASE_BTN_CONFIRM).setLabel("Yes, release").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(RELEASE_BTN_CANCEL).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      );

      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle("Release Companion?")
          .setDescription(`Are you sure you want to release **${pet.name || typeInfo?.name}**? This cannot be undone.`)],
        components: [row],
      });
    }
  });
}

export async function handleButton(interaction) {
  const id = interaction.customId;
  if (id !== RELEASE_BTN_CONFIRM && id !== RELEASE_BTN_CANCEL) return false;

  const userId = interaction.user.id;
  const pending = pendingReleases.get(userId);

  if (!pending || Date.now() > pending.expiresAt) {
    pendingReleases.delete(userId);
    return interaction.update({ content: "This confirmation expired.", embeds: [], components: [] });
  }

  pendingReleases.delete(userId);

  if (id === RELEASE_BTN_CANCEL) {
    return interaction.update({ content: "Release cancelled.", embeds: [], components: [] });
  }

  await deletePet(pending.petId, userId);
  return interaction.update({
    embeds: [new EmbedBuilder()
      .setColor(Colors.INFO)
      .setDescription(`🐾 **${pending.petName}** has been released. Goodbye, friend.`)],
    components: [],
  });
}
