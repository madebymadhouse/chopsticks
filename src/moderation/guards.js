import { PermissionFlagsBits } from "discord.js";

function memberHasAdmin(member) {
  return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator));
}

export async function fetchTargetMember(guild, userId) {
  if (!guild || !userId) return null;
  return guild.members.fetch(userId).catch(() => null);
}

function actorIsGuildOwner(interaction) {
  return String(interaction.guild?.ownerId || "") === String(interaction.user?.id || "");
}

export function canModerateTarget(interaction, targetMember, { allowSelf = false } = {}) {
  if (!interaction?.guild || !interaction?.member) {
    return { ok: false, reason: "guild-context-required" };
  }
  if (!targetMember) {
    return { ok: true };
  }

  const actorId = String(interaction.user?.id || "");
  const targetId = String(targetMember.id || targetMember.user?.id || "");
  const botMember = interaction.guild.members.me;

  if (!allowSelf && actorId && targetId && actorId === targetId) {
    return { ok: false, reason: "self-action" };
  }

  if (targetId && targetId === String(interaction.client?.user?.id || "")) {
    return { ok: false, reason: "target-is-bot" };
  }

  if (targetId && targetId === String(interaction.guild.ownerId || "")) {
    return { ok: false, reason: "target-is-owner" };
  }

  if (!actorIsGuildOwner(interaction)) {
    const actorHighest = interaction.member.roles?.highest?.position ?? -1;
    const targetHighest = targetMember.roles?.highest?.position ?? -1;
    if (targetHighest >= actorHighest) {
      return { ok: false, reason: "role-hierarchy" };
    }
  }

  if (botMember) {
    const botHighest = botMember.roles?.highest?.position ?? -1;
    const targetHighest = targetMember.roles?.highest?.position ?? -1;
    if (targetHighest >= botHighest) {
      return { ok: false, reason: "bot-role-hierarchy" };
    }
  }

  if (memberHasAdmin(targetMember) && !actorIsGuildOwner(interaction)) {
    return { ok: false, reason: "target-is-admin" };
  }

  return { ok: true };
}

export function moderationGuardMessage(reason) {
  switch (reason) {
    case "guild-context-required":
      return "This command can only be used in a guild.";
    case "self-action":
      return "You cannot run this moderation action on yourself.";
    case "target-is-bot":
      return "You cannot run this moderation action on the bot account.";
    case "target-is-owner":
      return "You cannot moderate the guild owner.";
    case "role-hierarchy":
      return "Your highest role must be above the target's highest role.";
    case "bot-role-hierarchy":
      return "Bot role hierarchy prevents this action. Move the bot role above the target role.";
    case "target-is-admin":
      return "Target has Administrator permission. Only guild owner can override.";
    default:
      return "Target failed moderation safety checks.";
  }
}
