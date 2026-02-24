import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { botLogger } from "../utils/modernLogger.js";
import { sanitizeString } from "../utils/validation.js";

export const meta = {
  category: "tools",
  guildOnly: true,
};

export const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create a timed poll with automatic result reveal")
  .addStringOption(o =>
    o.setName("question").setDescription("Poll question").setRequired(true).setMaxLength(200)
  )
  .addStringOption(o =>
    o.setName("options")
      .setDescription("Comma-separated options (2-10)")
      .setRequired(true)
      .setMaxLength(500)
  )
  .addIntegerOption(o =>
    o.setName("duration")
      .setDescription("Poll duration in minutes (1-1440, default: 5)")
      .setMinValue(1)
      .setMaxValue(1440)
      .setRequired(false)
  )
  .addBooleanOption(o =>
    o.setName("select_menu")
      .setDescription("Use a select menu instead of reactions for voting (default: false)")
      .setRequired(false)
  )
  .addRoleOption(o =>
    o.setName("required_role")
      .setDescription("Restrict voting to members with this role")
      .setRequired(false)
  );

const VOTE_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
const BAR_FILL = "█";
const BAR_EMPTY = "░";
const BAR_LEN = 10;

function buildBar(ratio) {
  const filled = Math.round(ratio * BAR_LEN);
  return BAR_FILL.repeat(filled) + BAR_EMPTY.repeat(BAR_LEN - filled);
}

export async function execute(interaction) {
  const question = sanitizeString(interaction.options.getString("question", true));
  const rawOpts = interaction.options.getString("options", true)
    .split(",").map(s => s.trim()).filter(Boolean);
  const durationMin = interaction.options.getInteger("duration") ?? 5;
  const useSelectMenu = interaction.options.getBoolean("select_menu") ?? false;
  const requiredRole = interaction.options.getRole("required_role");

  if (rawOpts.length < 2 || rawOpts.length > 10) {
    return interaction.reply({ content: "❌ Provide 2–10 comma-separated options.", ephemeral: true });
  }

  const endsAt = Date.now() + durationMin * 60 * 1000;
  const endsStr = `<t:${Math.floor(endsAt / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setDescription(rawOpts.map((opt, i) => `${VOTE_EMOJI[i]} **${opt}**`).join("\n"))
    .setColor(0x5865f2)
    .setFooter({ text: `Poll ends ${endsStr.replace(/<[^>]+>/g, "")} · ${durationMin}m${requiredRole ? ` · ${requiredRole.name} only` : ""}` })
    .addFields({ name: "Ends", value: endsStr, inline: true });

  // Select-menu mode: votes tracked in memory
  const selectVotes = useSelectMenu ? new Map() : null; // userId → optionIndex

  if (useSelectMenu) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`chopsticks:poll:vote`)
      .setPlaceholder("Cast your vote…")
      .addOptions(rawOpts.map((opt, i) => ({ label: opt.slice(0, 100), value: String(i), emoji: VOTE_EMOJI[i] })));
    const row = new ActionRowBuilder().addComponents(menu);
    await interaction.reply({ embeds: [embed], components: [row] });
  } else {
    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();
    for (let i = 0; i < rawOpts.length; i++) {
      await msg.react(VOTE_EMOJI[i]).catch(() => {});
    }
  }

  const msg = await interaction.fetchReply();

  // Register a temporary select-menu handler
  if (useSelectMenu) {
    const collector = msg.createMessageComponentCollector({ time: durationMin * 60 * 1000 });
    collector.on("collect", async i => {
      if (i.customId !== "chopsticks:poll:vote") return;
      if (requiredRole && !i.member?.roles.cache.has(requiredRole.id)) {
        return i.reply({ content: `> You need the **${requiredRole.name}** role to vote.`, ephemeral: true });
      }
      const choice = Number(i.values[0]);
      selectVotes.set(i.user.id, choice);
      await i.reply({ content: `> Your vote for **${rawOpts[choice]}** has been recorded.`, ephemeral: true });
    });
  }

  // Schedule result reveal
  const delay = Math.min(durationMin * 60 * 1000, 60 * 60 * 1000);
  setTimeout(async () => {
    try {
      const fresh = await msg.fetch().catch(() => null);
      if (!fresh) return;

      let votes;
      if (useSelectMenu && selectVotes) {
        const counts = rawOpts.map((_, i) => ({ opt: rawOpts[i], count: 0 }));
        for (const idx of selectVotes.values()) counts[idx].count++;
        votes = counts;
      } else {
        votes = rawOpts.map((opt, i) => {
          const reaction = fresh.reactions.cache.get(VOTE_EMOJI[i]);
          return { opt, count: Math.max(0, (reaction?.count ?? 1) - 1) };
        });
      }
      const total = votes.reduce((s, v) => s + v.count, 0);

      const resultEmbed = new EmbedBuilder()
        .setTitle(`📊 Poll Closed: ${question}`)
        .setColor(0x57f287)
        .setDescription(
          votes.map((v, i) => {
            const ratio = total > 0 ? v.count / total : 0;
            const pct = total > 0 ? Math.round(ratio * 100) : 0;
            const bar = buildBar(ratio);
            return `${VOTE_EMOJI[i]} **${v.opt}**\n\`${bar}\` ${pct}% (${v.count} vote${v.count !== 1 ? "s" : ""})`;
          }).join("\n\n")
        )
        .addFields({ name: "Total votes", value: String(total), inline: true })
        .setFooter({ text: "Poll closed" })
        .setTimestamp();

      await fresh.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
    } catch (err) {
      botLogger.warn({ err }, "[poll] result reveal failed");
    }
  }, delay).unref();
}

