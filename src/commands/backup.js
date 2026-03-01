// src/commands/backup.js
// Server Backup — snapshot roles, channels, and permissions; restore with one click.
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from "discord.js";
import { loadGuildData, saveGuildData } from "../utils/storage.js";
import { withTimeout } from "../utils/interactionTimeout.js";
import { Colors } from "../utils/discordOutput.js";

export const meta = {
  deployGlobal: false,
  category: "admin",
  guildOnly: true,
  userPerms: [PermissionFlagsBits.Administrator],
};

const MAX_BACKUPS = 5;
const BTN_CONFIRM = "backup:confirm:";
const BTN_CANCEL  = "backup:cancel";

export const data = new SlashCommandBuilder()
  .setName("backup")
  .setDescription("Backup and restore server structure (roles, channels, permissions)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(s => s
    .setName("create")
    .setDescription(`Create a snapshot of this server (max ${MAX_BACKUPS})`)
    .addStringOption(o => o.setName("label").setDescription("Optional label for this backup").setMaxLength(40))
  )
  .addSubcommand(s => s
    .setName("list")
    .setDescription("List all backups for this server")
  )
  .addSubcommand(s => s
    .setName("restore")
    .setDescription("Restore a backup (creates missing roles/categories/channels)")
    .addIntegerOption(o => o
      .setName("index")
      .setDescription("Backup index from /backup list (1-based)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(MAX_BACKUPS)
    )
  )
  .addSubcommand(s => s
    .setName("delete")
    .setDescription("Delete a backup")
    .addIntegerOption(o => o
      .setName("index")
      .setDescription("Backup index from /backup list (1-based)")
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(MAX_BACKUPS)
    )
  );

// ── snapshot builder ─────────────────────────────────────────────────────────

function snapshotRoles(guild) {
  return guild.roles.cache
    .filter(r => !r.managed && r.id !== guild.id) // skip @everyone and managed
    .sort((a, b) => b.position - a.position)
    .map(r => ({
      name: r.name,
      color: r.color,
      hoist: r.hoist,
      mentionable: r.mentionable,
      permissions: r.permissions.bitfield.toString(),
      position: r.position,
    }));
}

function snapshotChannels(guild) {
  const out = [];
  // Categories first
  guild.channels.cache
    .filter(c => c.type === ChannelType.GuildCategory)
    .forEach(cat => {
      out.push({
        type: "category",
        name: cat.name,
        position: cat.position,
        permissionOverwrites: cat.permissionOverwrites.cache.map(ov => ({
          id: ov.id,
          type: ov.type,
          allow: ov.allow.bitfield.toString(),
          deny: ov.deny.bitfield.toString(),
        })),
      });
    });
  // Text + voice channels
  guild.channels.cache
    .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildAnnouncement)
    .forEach(ch => {
      out.push({
        type: ch.type === ChannelType.GuildVoice ? "voice" : "text",
        name: ch.name,
        topic: ch.topic ?? null,
        nsfw: ch.nsfw ?? false,
        categoryName: ch.parent?.name ?? null,
        position: ch.position,
        permissionOverwrites: ch.permissionOverwrites.cache.map(ov => ({
          id: ov.id,
          type: ov.type,
          allow: ov.allow.bitfield.toString(),
          deny: ov.deny.bitfield.toString(),
        })),
      });
    });
  return out;
}

function createSnapshot(guild, label) {
  return {
    id: Date.now().toString(36),
    label: label || null,
    createdAt: new Date().toISOString(),
    guildName: guild.name,
    roles: snapshotRoles(guild),
    channels: snapshotChannels(guild),
    memberCount: guild.memberCount,
  };
}

// ── restore logic ─────────────────────────────────────────────────────────────

async function applyRestore(guild, snapshot, logLines) {
  // 1. Restore roles (create missing, skip existing by name)
  const existingRoleNames = new Set(guild.roles.cache.map(r => r.name.toLowerCase()));
  let rolesCreated = 0;
  for (const r of snapshot.roles) {
    if (existingRoleNames.has(r.name.toLowerCase())) continue;
    try {
      await guild.roles.create({
        name: r.name,
        color: r.color || null,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: BigInt(r.permissions || "0"),
        reason: "Backup restore",
      });
      rolesCreated++;
    } catch {
      logLines.push(`⚠️ Could not create role: **${r.name}**`);
    }
  }
  logLines.push(`✅ Roles: created **${rolesCreated}** missing role(s)`);

  // 2. Restore categories
  const existingCatNames = new Set(
    guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).map(c => c.name.toLowerCase())
  );
  let catsCreated = 0;
  for (const cat of snapshot.channels.filter(c => c.type === "category")) {
    if (existingCatNames.has(cat.name.toLowerCase())) continue;
    try {
      await guild.channels.create({
        name: cat.name,
        type: ChannelType.GuildCategory,
        reason: "Backup restore",
      });
      catsCreated++;
    } catch {
      logLines.push(`⚠️ Could not create category: **${cat.name}**`);
    }
  }
  logLines.push(`✅ Categories: created **${catsCreated}** missing`);

  // 3. Restore text/voice channels
  const existingChNames = new Set(
    guild.channels.cache.map(c => c.name.toLowerCase())
  );
  let chCreated = 0;
  for (const ch of snapshot.channels.filter(c => c.type !== "category")) {
    if (existingChNames.has(ch.name.toLowerCase())) continue;
    const parent = ch.categoryName
      ? guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === ch.categoryName.toLowerCase())
      : null;
    try {
      await guild.channels.create({
        name: ch.name,
        type: ch.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText,
        topic: ch.topic ?? undefined,
        nsfw: ch.nsfw ?? false,
        parent: parent?.id ?? null,
        reason: "Backup restore",
      });
      chCreated++;
    } catch {
      logLines.push(`⚠️ Could not create channel: **${ch.name}**`);
    }
  }
  logLines.push(`✅ Channels: created **${chCreated}** missing`);
}

// ── pending restore confirmations (in-memory) ─────────────────────────────────
const pendingRestores = new Map(); // interactionId -> { guildId, snapshotIndex, snapshot, expiresAt }

export async function handleButton(interaction) {
  const id = interaction.customId;
  if (!id.startsWith("backup:")) return false;

  if (id === BTN_CANCEL) {
    pendingRestores.delete(interaction.message.id);
    await interaction.update({ content: "❌ Restore cancelled.", embeds: [], components: [] });
    return true;
  }

  if (id.startsWith(BTN_CONFIRM)) {
    const entry = pendingRestores.get(interaction.message.id);
    if (!entry || entry.guildId !== interaction.guildId) {
      await interaction.reply({ content: "> Restore session expired or not found.", flags: MessageFlags.Ephemeral });
      return true;
    }
    if (Date.now() > entry.expiresAt) {
      pendingRestores.delete(interaction.message.id);
      await interaction.update({ content: "⏱️ Confirmation timed out. Run `/backup restore` again.", embeds: [], components: [] });
      return true;
    }
    // Only the original user can confirm
    if (interaction.user.id !== entry.userId) {
      await interaction.reply({ content: "> Only the person who ran this command can confirm.", flags: MessageFlags.Ephemeral });
      return true;
    }

    pendingRestores.delete(interaction.message.id);
    await interaction.update({ content: "⏳ Applying restore... this may take a moment.", embeds: [], components: [] });

    const logLines = [];
    try {
      await applyRestore(interaction.guild, entry.snapshot, logLines);
    } catch (err) {
      await interaction.editReply({ content: `❌ Restore failed: ${err?.message ?? err}` });
      return true;
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Backup Restored")
      .setDescription(logLines.join("\n") || "No changes were needed.")
      .setColor(Colors.SUCCESS ?? 0x57f287)
      .setFooter({ text: `Backup: ${entry.snapshot.label || entry.snapshot.id} • ${entry.snapshot.createdAt.slice(0, 10)}` })
      .setTimestamp();
    await interaction.editReply({ content: "", embeds: [embed], components: [] });
    return true;
  }

  return false;
}

// ── command ───────────────────────────────────────────────────────────────────

export async function execute(interaction) {
  await withTimeout(interaction, async () => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "create") {
      const label = interaction.options.getString("label") ?? null;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const gData = await loadGuildData(guildId);
      const backups = Array.isArray(gData.backups) ? gData.backups : [];

      if (backups.length >= MAX_BACKUPS) {
        return interaction.editReply({ content: `❌ You already have **${MAX_BACKUPS}** backups. Delete one first with \`/backup delete\`.` });
      }

      const snapshot = createSnapshot(interaction.guild, label);
      backups.push(snapshot);
      gData.backups = backups;
      await saveGuildData(guildId, gData);

      const embed = new EmbedBuilder()
        .setTitle("📦 Backup Created")
        .setColor(Colors.SUCCESS ?? 0x57f287)
        .addFields(
          { name: "ID", value: snapshot.id, inline: true },
          { name: "Label", value: snapshot.label || "—", inline: true },
          { name: "Roles", value: String(snapshot.roles.length), inline: true },
          { name: "Channels", value: String(snapshot.channels.length), inline: true },
          { name: "Members at time", value: String(snapshot.memberCount), inline: true },
        )
        .setFooter({ text: `Backup ${backups.length}/${MAX_BACKUPS}` })
        .setTimestamp();
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === "list") {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const gData = await loadGuildData(guildId);
      const backups = Array.isArray(gData.backups) ? gData.backups : [];

      if (!backups.length) {
        return interaction.editReply({ content: "> No backups found. Use `/backup create` to create one." });
      }

      const lines = backups.map((b, i) =>
        `**${i + 1}.** \`${b.id}\` — ${b.label || "*(no label)*"} — ${b.roles.length} roles, ${b.channels.length} channels — <t:${Math.floor(new Date(b.createdAt).getTime() / 1000)}:d>`
      );
      const embed = new EmbedBuilder()
        .setTitle("📦 Server Backups")
        .setDescription(lines.join("\n"))
        .setColor(Colors.INFO ?? 0x5865f2)
        .setFooter({ text: `${backups.length}/${MAX_BACKUPS} used` });
      return interaction.editReply({ embeds: [embed] });
    }

    if (sub === "restore") {
      const index = interaction.options.getInteger("index", true) - 1;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const gData = await loadGuildData(guildId);
      const backups = Array.isArray(gData.backups) ? gData.backups : [];
      const snapshot = backups[index];
      if (!snapshot) return interaction.editReply({ content: `❌ No backup at index ${index + 1}.` });

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Confirm Restore")
        .setDescription(
          `You are about to restore backup **${snapshot.label || snapshot.id}** from \`${snapshot.createdAt.slice(0, 10)}\`.\n\n` +
          `This will **create missing roles, categories, and channels**. Existing ones will not be deleted.\n\n` +
          `**${snapshot.roles.length}** roles • **${snapshot.channels.length}** channels`
        )
        .setColor(0xF39C12)
        .setFooter({ text: "This action expires in 60 seconds." });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${BTN_CONFIRM}${index}`)
          .setLabel("Confirm Restore")
          .setEmoji("✅")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(BTN_CANCEL)
          .setLabel("Cancel")
          .setEmoji("❌")
          .setStyle(ButtonStyle.Secondary),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
      const msg = await interaction.fetchReply();

      pendingRestores.set(msg.id, {
        guildId,
        userId: interaction.user.id,
        snapshot,
        snapshotIndex: index,
        expiresAt: Date.now() + 60_000,
      });
      return;
    }

    if (sub === "delete") {
      const index = interaction.options.getInteger("index", true) - 1;
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const gData = await loadGuildData(guildId);
      const backups = Array.isArray(gData.backups) ? gData.backups : [];
      if (!backups[index]) return interaction.editReply({ content: `❌ No backup at index ${index + 1}.` });
      const removed = backups.splice(index, 1)[0];
      gData.backups = backups;
      await saveGuildData(guildId, gData);
      return interaction.editReply({ content: `🗑️ Deleted backup **${removed.label || removed.id}** (${removed.createdAt.slice(0, 10)}).` });
    }
  }, { label: "backup" });
}
