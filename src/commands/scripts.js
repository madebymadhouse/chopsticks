import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType
} from "discord.js";
import { replyInteraction } from "../utils/interactionReply.js";
import { parseScriptDsl } from "../scripting/parser.js";
import { validateScriptDefinition } from "../scripting/validator.js";
import { renderScriptDefinition } from "../scripting/renderer.js";
import {
  upsertGuildScript,
  listGuildScripts,
  getGuildScript,
  insertScriptAudit,
  checkScriptRunPermission,
  logScriptingError
} from "../scripting/store.js";

export const meta = {
  guildOnly: true,
  userPerms: [PermissionFlagsBits.ManageGuild],
  category: "admin"
};

function buildContext(interaction, targetUser = null) {
  const user = targetUser || interaction.user;
  return {
    user: {
      id: user?.id,
      username: user?.username || user?.globalName || "user",
      name: user?.displayName || user?.username || "user"
    },
    guild: {
      id: interaction.guildId,
      name: interaction.guild?.name || "guild"
    },
    channel: {
      id: interaction.channelId,
      name: interaction.channel?.name || "channel"
    }
  };
}

function formatTrigger(script) {
  const type = script.trigger_type || "command";
  const value = script.trigger_value ? `:${script.trigger_value}` : "";
  return `${type}${value}`;
}

export const data = new SlashCommandBuilder()
  .setName("scripts")
  .setDescription("Create and run safe automation scripts")
  .addSubcommand(sub =>
    sub
      .setName("create")
      .setDescription("Create or update a script by name (versioned)")
      .addStringOption(o => o.setName("name").setDescription("Script name").setRequired(true))
      .addStringOption(o => o.setName("dsl").setDescription("Script JSON DSL").setRequired(true))
      .addStringOption(o =>
        o
          .setName("trigger_type")
          .setDescription("Execution trigger type")
          .setRequired(false)
          .addChoices(
            { name: "command", value: "command" },
            { name: "schedule", value: "schedule" },
            { name: "event", value: "event" }
          )
      )
      .addStringOption(o => o.setName("trigger_value").setDescription("Trigger value (cron/event key/command alias)").setRequired(false))
      .addBooleanOption(o => o.setName("active").setDescription("Enable or disable this script").setRequired(false))
      .addStringOption(o => o.setName("note").setDescription("Change note for audit log").setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName("list")
      .setDescription("List scripts for this server")
      .addBooleanOption(o => o.setName("active_only").setDescription("Show only active scripts").setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName("test")
      .setDescription("Render a script preview without posting to channel")
      .addStringOption(o => o.setName("script_id").setDescription("Script ID").setRequired(true))
      .addUserOption(o => o.setName("target_user").setDescription("Optional target user context").setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName("run")
      .setDescription("Execute a command-trigger script immediately")
      .addStringOption(o => o.setName("script_id").setDescription("Script ID").setRequired(true))
      .addChannelOption(o =>
        o
          .setName("channel")
          .setDescription("Optional destination channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
      .addUserOption(o => o.setName("target_user").setDescription("Optional target user context").setRequired(false))
  );

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const actorUserId = interaction.user.id;
  const sub = interaction.options.getSubcommand(true);

  if (sub === "create") {
    const name = interaction.options.getString("name", true);
    const dsl = interaction.options.getString("dsl", true);
    const triggerType = interaction.options.getString("trigger_type", false);
    const triggerValue = interaction.options.getString("trigger_value", false);
    const active = interaction.options.getBoolean("active", false);
    const note = interaction.options.getString("note", false) || "";

    try {
      const parsed = parseScriptDsl(dsl);
      const merged = {
        ...parsed,
        trigger: {
          ...(parsed.trigger || {}),
          ...(triggerType ? { type: triggerType } : {}),
          ...(triggerValue !== null ? { value: triggerValue } : {})
        }
      };
      const definition = validateScriptDefinition(merged);

      const result = await upsertGuildScript({
        guildId,
        name,
        triggerType: definition.trigger.type,
        triggerValue: definition.trigger.value,
        definition,
        isActive: active === null ? true : Boolean(active),
        actorUserId,
        changeNote: note
      });

      const embed = new EmbedBuilder()
        .setTitle(result.mode === "created" ? "Script Created" : "Script Updated")
        .setDescription(
          `Name: **${result.name}**\n` +
          `Script ID: \`${result.scriptId}\`\n` +
          `Version: \`${result.version}\`\n` +
          `Trigger: \`${definition.trigger.type}${definition.trigger.value ? `:${definition.trigger.value}` : ""}\``
        )
        .setColor(result.mode === "created" ? 0x2ecc71 : 0x3498db)
        .setTimestamp();

      await replyInteraction(interaction, { embeds: [embed] });
      return;
    } catch (error) {
      logScriptingError({ op: "create", guildId, actorUserId }, error);
      await replyInteraction(interaction, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Script Error")
            .setDescription(`Failed to create/update script.\n\`${error.message}\``)
            .setColor(0xe74c3c)
        ]
      });
      return;
    }
  }

  if (sub === "list") {
    const activeOnly = interaction.options.getBoolean("active_only", false) === true;
    try {
      const scripts = await listGuildScripts(guildId, { activeOnly, limit: 25 });
      if (!scripts.length) {
        await replyInteraction(interaction, {
          embeds: [
            new EmbedBuilder()
              .setTitle("Scripts")
              .setDescription("No scripts found for this guild.")
              .setColor(0x95a5a6)
          ]
        });
        return;
      }

      const lines = scripts.map(s =>
        `\`${s.script_id}\`  **${s.name}**  ` +
        `(${formatTrigger(s)})  ` +
        `v${s.current_version}  ` +
        `${s.is_active ? "active" : "disabled"}`
      );
      const embed = new EmbedBuilder()
        .setTitle("Scripts")
        .setDescription(lines.join("\n").slice(0, 4096))
        .setFooter({ text: `Total: ${scripts.length}` })
        .setColor(0x5865f2);
      await replyInteraction(interaction, { embeds: [embed] });
      return;
    } catch (error) {
      logScriptingError({ op: "list", guildId, actorUserId }, error);
      await replyInteraction(interaction, {
        embeds: [new EmbedBuilder().setTitle("Script Error").setDescription(error.message).setColor(0xe74c3c)]
      });
      return;
    }
  }

  if (sub === "test") {
    const scriptId = interaction.options.getString("script_id", true);
    const targetUser = interaction.options.getUser("target_user", false);
    try {
      const script = await getGuildScript(guildId, scriptId);
      if (!script) {
        await replyInteraction(interaction, {
          embeds: [new EmbedBuilder().setTitle("Not Found").setDescription("Script not found.").setColor(0xe67e22)]
        });
        return;
      }

      const rendered = renderScriptDefinition(script.definition, buildContext(interaction, targetUser));
      await insertScriptAudit({
        guildId,
        scriptId: script.script_id,
        actorUserId,
        action: "test",
        details: { trigger: script.trigger_type, targetUserId: targetUser?.id || null }
      });

      await replyInteraction(
        interaction,
        {
          embeds: [
            new EmbedBuilder()
              .setTitle(`Script Test: ${script.name}`)
              .setDescription(
                `ID: \`${script.script_id}\`\n` +
                `Version: \`${script.current_version}\`\n` +
                `Trigger: \`${formatTrigger(script)}\`\n` +
                `Preview follows below.`
              )
              .setColor(0x1abc9c)
          ]
        }
      );

      await interaction.followUp({
        ...rendered.payload,
        flags: 64
      });
      return;
    } catch (error) {
      logScriptingError({ op: "test", guildId, actorUserId, scriptId }, error);
      await replyInteraction(interaction, {
        embeds: [new EmbedBuilder().setTitle("Script Error").setDescription(error.message).setColor(0xe74c3c)]
      });
      return;
    }
  }

  if (sub === "run") {
    const scriptId = interaction.options.getString("script_id", true);
    const destination = interaction.options.getChannel("channel", false);
    const targetUser = interaction.options.getUser("target_user", false);
    try {
      const script = await getGuildScript(guildId, scriptId);
      if (!script) {
        await replyInteraction(interaction, {
          embeds: [new EmbedBuilder().setTitle("Not Found").setDescription("Script not found.").setColor(0xe67e22)]
        });
        return;
      }
      if (!script.is_active) {
        await replyInteraction(interaction, {
          embeds: [new EmbedBuilder().setTitle("Disabled").setDescription("Script is disabled.").setColor(0xe67e22)]
        });
        return;
      }
      if (String(script.trigger_type || "command") !== "command") {
        await replyInteraction(interaction, {
          embeds: [
            new EmbedBuilder()
              .setTitle("Trigger Restricted")
              .setDescription("Only `command` trigger scripts can be run manually.")
              .setColor(0xe67e22)
          ]
        });
        return;
      }

      const allowed = await checkScriptRunPermission(script, interaction.member);
      if (!allowed) {
        await replyInteraction(interaction, {
          embeds: [
            new EmbedBuilder()
              .setTitle("Permission Denied")
              .setDescription("You are not allowed to execute this script.")
              .setColor(0xe74c3c)
          ]
        });
        return;
      }

      const rendered = renderScriptDefinition(script.definition, buildContext(interaction, targetUser));
      const targetChannel = destination || interaction.channel;
      if (!targetChannel?.isTextBased?.()) {
        throw new Error("Destination channel is not text-based.");
      }

      await targetChannel.send(rendered.payload);
      await insertScriptAudit({
        guildId,
        scriptId: script.script_id,
        actorUserId,
        action: "run",
        details: { channelId: targetChannel.id, targetUserId: targetUser?.id || null }
      });

      await replyInteraction(interaction, {
        embeds: [
          new EmbedBuilder()
            .setTitle("Script Executed")
            .setDescription(`Ran \`${script.name}\` in <#${targetChannel.id}>`)
            .setColor(0x2ecc71)
        ]
      });
      return;
    } catch (error) {
      logScriptingError({ op: "run", guildId, actorUserId, scriptId }, error);
      await replyInteraction(interaction, {
        embeds: [new EmbedBuilder().setTitle("Script Error").setDescription(error.message).setColor(0xe74c3c)]
      });
      return;
    }
  }
}

export default { data, execute, meta };

