import { loadGuildData } from "../utils/storage.js";
import {
  normalizeReactionRoleConfig,
  emojiKeyFromReaction,
  reactionRoleBindingKey
} from "../utils/reactionRoles.js";
import { logger } from "../utils/logger.js";

export default {
  name: "messageReactionRemove",
  async execute(reaction, user) {
    if (!user || user.bot) return;

    try {
      if (reaction?.partial) await reaction.fetch();
    } catch (error) {
      logger.warn({ err: error }, "[reactionroles:remove] failed to fetch partial reaction");
      return;
    }

    const guild = reaction?.message?.guild;
    if (!guild) return;

    const emojiKey = emojiKeyFromReaction(reaction);
    if (!emojiKey) return;

    const guildData = normalizeReactionRoleConfig(await loadGuildData(guild.id));
    const key = reactionRoleBindingKey(reaction.message.channelId, reaction.message.id, emojiKey);
    const binding = guildData?.reactionRoles?.bindings?.[key];
    if (!binding?.roleId) return;

    let member = reaction.message.member;
    if (!member || member.id !== user.id) {
      try {
        member = await guild.members.fetch(user.id);
      } catch (error) {
        logger.warn({ err: error }, "[reactionroles:remove] could not fetch member");
        return;
      }
    }

    try {
      if (member.roles.cache.has(binding.roleId)) {
        await member.roles.remove(binding.roleId, "Reaction role remove");
      }
    } catch (error) {
      logger.warn({ err: error }, "[reactionroles:remove] role update failed");
    }
  }
};
