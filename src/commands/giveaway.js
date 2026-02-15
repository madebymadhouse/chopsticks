import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from "discord.js";
import { schedule } from "../utils/scheduler.js";
import { maybeBuildGuildFunLine } from "../fun/integrations.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild]
};

export const data = new SlashCommandBuilder()
  .setName("giveaway")
  .setDescription("Simple giveaway")
  .addSubcommand(s =>
    s
      .setName("start")
      .setDescription("Start a giveaway")
      .addIntegerOption(o => o.setName("minutes").setDescription("Duration").setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption(o => o.setName("winners").setDescription("Winners").setRequired(true).setMinValue(1).setMaxValue(10))
      .addStringOption(o => o.setName("prize").setDescription("Prize").setRequired(true))
  )
  .addSubcommand(s =>
    s
      .setName("end")
      .setDescription("End a giveaway")
      .addStringOption(o => o.setName("message_id").setDescription("Giveaway message ID").setRequired(true))
  );

async function pickWinners(msg, count) {
  const reaction = msg.reactions.cache.get("🎉");
  if (!reaction) return { winners: [], entrants: 0 };
  const users = await reaction.users.fetch();
  const pool = users.filter(u => !u.bot).map(u => u.id);
  const entrants = pool.length;
  const winners = [];
  while (pool.length && winners.length < count) {
    const i = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(i, 1)[0]);
  }
  return { winners, entrants };
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === "start") {
    const minutes = interaction.options.getInteger("minutes", true);
    const winnersCount = interaction.options.getInteger("winners", true);
    const prize = interaction.options.getString("prize", true);
    const flavor = await maybeBuildGuildFunLine({
      guildId: interaction.guildId,
      feature: "giveaway",
      actorTag: interaction.user.username,
      target: prize,
      intensity: 3,
      maxLength: 180
    });
    const content =
      `GIVEAWAY\nPrize: **${prize}**\nReact with the giveaway reaction to enter.\nEnds in ${minutes} minutes.` +
      (flavor ? `\n\n${flavor}` : "");
    await interaction.reply({
      content: content.slice(0, 1900),
      fetchReply: true
    });
    const msg = await interaction.fetchReply();
    await msg.react("🎉").catch(() => {});
    schedule(`giveaway:${msg.id}`, minutes * 60 * 1000, async () => {
      const m = await interaction.channel.messages.fetch(msg.id).catch(() => null);
      if (!m) return;
      const { winners, entrants } = await pickWinners(m, winnersCount);
      const text = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No entries.";
      const winnerFlavor = await maybeBuildGuildFunLine({
        guildId: interaction.guildId,
        feature: "giveaway",
        actorTag: interaction.user.username,
        target: text,
        intensity: 4,
        maxLength: 160,
        context: { phase: "end", entrants, winnerCount: winners.length }
      });
      const winnerMsg = `Winner(s): ${text}` + (winnerFlavor ? `\n${winnerFlavor}` : "");
      await m.reply(winnerMsg.slice(0, 1900));
    });
    return;
  }

  const messageId = interaction.options.getString("message_id", true);
  const msg = await interaction.channel.messages.fetch(messageId).catch(() => null);
  if (!msg) {
    await interaction.reply({ flags: MessageFlags.Ephemeral, content: "Message not found." });
    return;
  }
  const { winners, entrants } = await pickWinners(msg, 1);
  const text = winners.length ? winners.map(id => `<@${id}>`).join(", ") : "No entries.";
  const flavor = await maybeBuildGuildFunLine({
    guildId: interaction.guildId,
    feature: "giveaway",
    actorTag: interaction.user.username,
    target: text,
    intensity: 4,
    maxLength: 160,
    context: { phase: "end", entrants, winnerCount: winners.length }
  });
  await interaction.reply({ content: (`Winner(s): ${text}` + (flavor ? `\n${flavor}` : "")).slice(0, 1900) });
}
