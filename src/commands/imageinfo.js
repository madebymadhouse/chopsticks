// src/commands/imageinfo.js
// Better info commands with rich embeds:
// /avatar [user] — user avatar with download button
// /banner [user] — user banner
// /serverinfo — rich server embed with boost progress bar
// /roleinfo <role> — detailed role info
// /channelinfo [channel] — detailed channel info
// /userinfo [user] — detailed user info

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ChannelType,
} from "discord.js";

export const meta = {
  name: "avatar",
  category: "utility",
  deployGlobal: true,
};

function boostBar(tier, count) {
  const maxForTier = [2, 7, 14];
  const max = maxForTier[tier] ?? 14;
  const fill = Math.min(count, max);
  const bar = "█".repeat(fill) + "░".repeat(max - fill);
  return `\`${bar}\` ${count}/${max} (Tier ${tier})`;
}

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Server and user information commands")

  .addSubcommand(s => s
    .setName("avatar")
    .setDescription("View a user's avatar")
    .addUserOption(o => o.setName("user").setDescription("User (defaults to you)")))

  .addSubcommand(s => s
    .setName("banner")
    .setDescription("View a user's profile banner")
    .addUserOption(o => o.setName("user").setDescription("User (defaults to you)")))

  .addSubcommand(s => s
    .setName("server")
    .setDescription("View detailed server information"))

  .addSubcommand(s => s
    .setName("role")
    .setDescription("View detailed role information")
    .addRoleOption(o => o.setName("role").setDescription("Role to inspect").setRequired(true)))

  .addSubcommand(s => s
    .setName("channel")
    .setDescription("View channel information")
    .addChannelOption(o => o.setName("channel").setDescription("Channel (defaults to current)")))

  .addSubcommand(s => s
    .setName("user")
    .setDescription("View detailed user information")
    .addUserOption(o => o.setName("user").setDescription("User (defaults to you)")));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === "avatar") {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);
    const guildAvatar = member?.displayAvatarURL({ size: 4096 });
    const globalAvatar = target.displayAvatarURL({ size: 4096 });

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}'s Avatar`)
      .setImage(guildAvatar ?? globalAvatar)
      .setColor(0x5865F2);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(guildAvatar ?? globalAvatar),
    );
    if (guildAvatar && guildAvatar !== globalAvatar) {
      row.addComponents(new ButtonBuilder().setLabel("Global Avatar").setStyle(ButtonStyle.Link).setURL(globalAvatar));
    }

    return interaction.reply({ embeds: [embed], components: [row] });
  }

  if (sub === "banner") {
    const target = await (interaction.options.getUser("user") ?? interaction.user).fetch();
    const bannerUrl = target.bannerURL({ size: 4096 });
    if (!bannerUrl) return interaction.reply({ content: `> ${target.username} doesn't have a banner.`, flags: MessageFlags.Ephemeral });
    const embed = new EmbedBuilder().setTitle(`${target.username}'s Banner`).setImage(bannerUrl).setColor(target.accentColor ?? 0x5865F2);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel("Download").setStyle(ButtonStyle.Link).setURL(bannerUrl));
    return interaction.reply({ embeds: [embed], components: [row] });
  }

  if (sub === "server") {
    const guild = interaction.guild;
    await guild.fetch();
    const owner = await guild.fetchOwner().catch(() => null);
    const channels = guild.channels.cache;
    const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const members = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;

    const embed = new EmbedBuilder()
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .setColor(0x5865F2)
      .addFields(
        { name: "Owner", value: owner ? `<@${owner.id}>` : "Unknown", inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Members", value: `${members} (${bots} bots)`, inline: true },
        { name: "Channels", value: `${textCount} text • ${voiceCount} voice • ${categoryCount} categories`, inline: true },
        { name: "Roles", value: String(guild.roles.cache.size), inline: true },
        { name: "Emojis", value: String(guild.emojis.cache.size), inline: true },
        { name: "Boost Level", value: `Tier ${guild.premiumTier}`, inline: true },
        { name: "Boosts", value: boostBar(guild.premiumTier, guild.premiumSubscriptionCount ?? 0), inline: false },
        { name: "Verification Level", value: ["None", "Low", "Medium", "High", "Highest"][guild.verificationLevel] ?? "?", inline: true },
      )
      .setFooter({ text: `ID: ${guild.id}` });

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "role") {
    const role = interaction.options.getRole("role", true);
    const members = role.members.size;
    const perms = role.permissions.toArray().slice(0, 10).map(p => `\`${p}\``).join(", ");

    const embed = new EmbedBuilder()
      .setTitle(`Role: ${role.name}`)
      .setColor(role.color || 0x99AAB5)
      .addFields(
        { name: "Color", value: `#${role.color.toString(16).padStart(6, "0")}`, inline: true },
        { name: "Members", value: String(members), inline: true },
        { name: "Position", value: String(role.position), inline: true },
        { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
        { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
        { name: "Managed", value: role.managed ? "Yes (integration)" : "No", inline: true },
        { name: "Created", value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Key Permissions", value: perms || "None", inline: false },
      )
      .setFooter({ text: `ID: ${role.id}` });
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "channel") {
    const ch = interaction.options.getChannel("channel") ?? interaction.channel;
    const embed = new EmbedBuilder()
      .setTitle(`#${ch.name ?? ch.id}`)
      .setColor(0x5865F2)
      .addFields(
        { name: "Type", value: ChannelType[ch.type] ?? String(ch.type), inline: true },
        { name: "Created", value: `<t:${Math.floor(ch.createdTimestamp / 1000)}:D>`, inline: true },
        ...(ch.topic ? [{ name: "Topic", value: ch.topic.slice(0, 200) }] : []),
        ...(ch.nsfw !== undefined ? [{ name: "NSFW", value: ch.nsfw ? "Yes" : "No", inline: true }] : []),
        ...(ch.rateLimitPerUser ? [{ name: "Slowmode", value: `${ch.rateLimitPerUser}s`, inline: true }] : []),
        ...(ch.parentId ? [{ name: "Category", value: `<#${ch.parentId}>`, inline: true }] : []),
      )
      .setFooter({ text: `ID: ${ch.id}` });
    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "user") {
    const target = interaction.options.getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);
    const joinedAt = member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>` : "Unknown";
    const roles = member?.roles.cache.filter(r => r.id !== interaction.guildId).map(r => `<@&${r.id}>`).slice(0, 10).join(" ") || "None";
    const badges = target.flags?.toArray()?.map(f => `\`${f}\``).join(", ") || "None";

    const embed = new EmbedBuilder()
      .setTitle(`${target.username}${target.discriminator !== "0" ? `#${target.discriminator}` : ""}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setColor(member?.displayColor || 0x5865F2)
      .addFields(
        { name: "Created", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Joined Server", value: joinedAt, inline: true },
        { name: "Bot", value: target.bot ? "Yes" : "No", inline: true },
        { name: "Badges", value: badges, inline: false },
        ...(member ? [{ name: "Roles", value: roles }] : []),
        ...(member?.premiumSince ? [{ name: "Boosting since", value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:D>`, inline: true }] : []),
      )
      .setFooter({ text: `ID: ${target.id}` });
    return interaction.reply({ embeds: [embed] });
  }
}
