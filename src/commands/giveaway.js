import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { schedule } from "../utils/scheduler.js";
import { maybeBuildGuildFunLine } from "../fun/integrations.js";
import { withTimeout } from "../utils/interactionTimeout.js";

export const meta = {
  deployGlobal: true,
  category: "community",
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild]
};

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Run and manage giveaways")
  .addSubcommand(s =>
    s.setName("start")
      .setDescription("Start a giveaway")
      .addIntegerOption(o => o.setName("minutes").setDescription("Duration").setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption(o => o.setName("winners").setDescription("Winners").setRequired(true).setMinValue(1).setMaxValue(10))
      .addStringOption(o => o.setName("prize").setDescription("Prize").setRequired(true))
      .addRoleOption(o => o.setName("required_role").setDescription("Role required to enter"))
  )
  .addSubcommand(s =>
    s.setName("end")
      .setDescription("End a giveaway early")
      .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true))
  )
  .addSubcommand(s =>
    s.setName("reroll")
      .setDescription("Reroll winners for an ended giveaway")
      .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true))
      .addIntegerOption(o => o.setName("winners").setDescription("Number of winners to reroll").setMinValue(1).setMaxValue(10))
  )
  .addSubcommand(s => s.setName("list").setDescription("List active giveaways in this server"))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// In-memory giveaway registry per guild: Map<guildId, Map<messageId, record>>
// record: { prize, winners, endsAt, channelId, requiredRoleId, active, entries: Set<userId>, hostId }
const activeGiveaways = new Map();

const BTN_ENTER = "giveaway:enter";
const BTN_LEAVE = "giveaway:leave";

function getGuildGiveaways(guildId) {
  if (!activeGiveaways.has(guildId)) activeGiveaways.set(guildId, new Map());
  return activeGiveaways.get(guildId);
}

function getRecordByMessageId(messageId) {
  for (const guild of activeGiveaways.values()) {
    const r = guild.get(messageId);
    if (r) return r;
  }
  return null;
}

function buildGiveawayEmbed(prize, winnersCount, endsAt, entries, requiredRoleName, hostTag, ended = false) {
  const entryCount = entries instanceof Set ? entries.size : Number(entries);
  const embed = new EmbedBuilder()
    .setTitle(ended ? "🎊 GIVEAWAY ENDED" : "🎉 GIVEAWAY")
    .setDescription(
      `**Prize:** ${prize}` +
      (requiredRoleName ? `\n**Required role:** ${requiredRoleName}` : "") +
      `\n\nClick **🎉 Enter** below to participate!`
    )
    .addFields(
      { name: ended ? "Ended" : "Ends", value: `<t:${Math.floor(endsAt / 1000)}:R>`, inline: true },
      { name: "Winners", value: String(winnersCount), inline: true },
      { name: "Entries", value: String(entryCount), inline: true },
    )
    .setColor(ended ? 0x95a5a6 : 0xF1C40F)
    .setFooter({ text: `Hosted by ${hostTag}` });
  return embed;
}

function buildGiveawayRow(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(BTN_ENTER)
      .setLabel("Enter Giveaway")
      .setEmoji("🎉")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(BTN_LEAVE)
      .setLabel("Leave")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

function pickWinnersFromEntries(entries, count, requiredRoleId, guild) {
  // entries is a Set<userId>; requiredRoleId filter applied inline
  let pool = [...entries];
  if (requiredRoleId && guild) {
    pool = pool.filter(uid => guild.members.cache.get(uid)?.roles.cache.has(requiredRoleId));
  }
  const winners = [];
  const remaining = [...pool];
  while (remaining.length && winners.length < count) {
    const i = Math.floor(Math.random() * remaining.length);
    winners.push(remaining.splice(i, 1)[0]);
  }
  return { winners, entrants: pool.length };
}

async function finalizeGiveaway(record, channel, messageId, guildId) {
  const m = await channel.messages.fetch(messageId).catch(() => null);
  if (!m) return;

  const guild = channel.guild;
  const { winners, entrants } = pickWinnersFromEntries(
    record.entries,
    record.winners,
    record.requiredRoleId,
    guild
  );
  const text = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No eligible entries.";
  const flavor = await maybeBuildGuildFunLine({
    guildId,
    feature: "giveaway",
    actorTag: record.hostTag ?? "Unknown",
    target: text,
    intensity: 4,
    maxLength: 160,
    context: { phase: "end", entrants, winnerCount: winners.length }
  }).catch(() => null);

  // Update embed to show ended state
  const endedEmbed = buildGiveawayEmbed(
    record.prize, record.winners, record.endsAt,
    record.entries, record.requiredRoleName ?? null, record.hostTag ?? "Unknown", true
  );
  await m.edit({ embeds: [endedEmbed], components: [buildGiveawayRow(true)] }).catch(() => {});
  await m.reply((`🎉 Winner(s): ${text}` + (flavor ? `\n${flavor}` : "")).slice(0, 1900)).catch(() => {});
  record.active = false;
}

export async function handleButton(interaction) {
  const id = interaction.customId;
  if (id !== BTN_ENTER && id !== BTN_LEAVE) return false;

  const messageId = interaction.message.id;
  const record = getRecordByMessageId(messageId);

  if (!record) {
    await interaction.reply({ content: "> This giveaway is no longer tracked.", flags: MessageFlags.Ephemeral });
    return true;
  }
  if (!record.active) {
    await interaction.reply({ content: "> This giveaway has already ended.", flags: MessageFlags.Ephemeral });
    return true;
  }

  const userId = interaction.user.id;

  // Required role check on entry
  if (id === BTN_ENTER && record.requiredRoleId) {
    const member = interaction.guild?.members.cache.get(userId)
      ?? await interaction.guild?.members.fetch(userId).catch(() => null);
    if (!member?.roles.cache.has(record.requiredRoleId)) {
      await interaction.reply({
        content: `> You need the <@&${record.requiredRoleId}> role to enter this giveaway.`,
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
  }

  if (id === BTN_ENTER) {
    if (record.entries.has(userId)) {
      await interaction.reply({ content: "> You're already in this giveaway!", flags: MessageFlags.Ephemeral });
      return true;
    }
    record.entries.add(userId);
    await interaction.reply({ content: "✅ You've entered the giveaway! Good luck!", flags: MessageFlags.Ephemeral });
  } else {
    if (!record.entries.has(userId)) {
      await interaction.reply({ content: "> You're not entered in this giveaway.", flags: MessageFlags.Ephemeral });
      return true;
    }
    record.entries.delete(userId);
    await interaction.reply({ content: "👋 You've left the giveaway.", flags: MessageFlags.Ephemeral });
  }

  // Update entry count in embed
  const updatedEmbed = buildGiveawayEmbed(
    record.prize, record.winners, record.endsAt,
    record.entries, record.requiredRoleName ?? null, record.hostTag ?? "Unknown"
  );
  await interaction.message.edit({ embeds: [updatedEmbed], components: [buildGiveawayRow()] }).catch(() => {});
  return true;
}

export async function execute(interaction) {
  await withTimeout(interaction, async () => {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "start") {
      const minutes = interaction.options.getInteger("minutes", true);
      const winnersCount = interaction.options.getInteger("winners", true);
      const prize = interaction.options.getString("prize", true);
      const requiredRole = interaction.options.getRole("required_role");
      const endsAt = Date.now() + minutes * 60 * 1000;

      const entries = new Set();
      const embed = buildGiveawayEmbed(
        prize, winnersCount, endsAt, entries,
        requiredRole?.name ?? null, interaction.user.tag
      );

      await interaction.reply({ embeds: [embed], components: [buildGiveawayRow()] });
      const msg = await interaction.fetchReply();

      const record = {
        prize, winners: winnersCount, endsAt,
        channelId: interaction.channelId,
        requiredRoleId: requiredRole?.id ?? null,
        requiredRoleName: requiredRole?.name ?? null,
        hostTag: interaction.user.tag,
        active: true,
        entries,
      };
      getGuildGiveaways(guildId).set(msg.id, record);

      schedule(`giveaway:${msg.id}`, minutes * 60 * 1000, async () => {
        await finalizeGiveaway(record, interaction.channel, msg.id, guildId);
      });
      return;
    }

    if (sub === "end") {
      const messageId = interaction.options.getString("message_id", true);
      const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!msg) return interaction.reply({ flags: MessageFlags.Ephemeral, content: "> Message not found." });
      const record = getGuildGiveaways(guildId).get(messageId);
      if (!record) return interaction.reply({ flags: MessageFlags.Ephemeral, content: "> Giveaway not found in registry." });
      await interaction.reply({ content: "⏩ Ending giveaway now...", flags: MessageFlags.Ephemeral });
      await finalizeGiveaway(record, interaction.channel, messageId, guildId);
      return;
    }

    if (sub === "reroll") {
      const messageId = interaction.options.getString("message_id", true);
      const count = interaction.options.getInteger("winners") ?? 1;
      const record = getGuildGiveaways(guildId).get(messageId);
      if (!record) return interaction.reply({ flags: MessageFlags.Ephemeral, content: "> Giveaway not found in registry." });
      const { winners } = pickWinnersFromEntries(record.entries, count, record.requiredRoleId, interaction.guild);
      const text = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No eligible entries.";
      return interaction.reply({ content: `🎲 Reroll result: ${text}` });
    }

    if (sub === "list") {
      const giveaways = getGuildGiveaways(guildId);
      const active = [...giveaways.entries()].filter(([, r]) => r.active);
      if (!active.length) return interaction.reply({ content: "> No active giveaways.", flags: MessageFlags.Ephemeral });
      const lines = active.map(([mid, r]) =>
        `• **${r.prize}** — <t:${Math.floor(r.endsAt / 1000)}:R> — ${r.winners} winner(s) — ${r.entries.size} entries — [Jump](https://discord.com/channels/${guildId}/${r.channelId}/${mid})`
      );
      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle("🎉 Active Giveaways").setDescription(lines.join("\n")).setColor(0xF1C40F)],
        flags: MessageFlags.Ephemeral
      });
    }
  }, { label: "giveaway" });
}

