import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import { Colors } from "../utils/discordOutput.js";
import { openDeployUiHandoff, openAdvisorUiHandoff } from "./agents.js";
import { execute as poolsExecute } from "./pools.js";
import { showVoiceConsole } from "../tools/voice/ui.js";
import { getVoiceState } from "../tools/voice/schema.js";
import { ensureCustomVcsState, getCustomVcConfig } from "../tools/voice/customVcsState.js";
import { buildCustomVcPanelMessage } from "../tools/voice/customVcsUi.js";
import { fetchPool, getGuildSelectedPool } from "../utils/storage.js";

export const meta = {
  guildOnly: false,
  userPerms: [],
  category: "core"
};

const TUTORIAL_UI_PREFIX = "tutorialsui";

const TOPICS = [
  {
    key: "start",
    label: "Start Here",
    description: "What Chopsticks is and what to do first."
  },
  {
    key: "v1",
    label: "V1 Readiness",
    description: "Deployment checklist + admin diagnostics (in development)."
  },
  {
    key: "pools",
    label: "Agent Pools",
    description: "Create pools, add agents, deploy, and scale."
  },
  {
    key: "voice",
    label: "VoiceMaster (Auto Rooms)",
    description: "Auto temp voice rooms from lobbies + owner dashboards."
  },
  {
    key: "customvcs",
    label: "Custom VCs (Panel)",
    description: "Panel-based on-demand rooms with guestlists (in development)."
  },
  {
    key: "music",
    label: "Music",
    description: "Playback, agent capacity, and troubleshooting."
  },
  {
    key: "moderation",
    label: "Moderation",
    description: "Purge, safety, and server controls."
  },
  {
    key: "troubleshooting",
    label: "Troubleshooting",
    description: "Common issues: no DMs, missing perms, spawning failures."
  }
];

function hasManageGuild(interaction) {
  const perms = interaction.memberPermissions;
  return Boolean(
    perms?.has?.(PermissionFlagsBits.ManageGuild) ||
    perms?.has?.(PermissionFlagsBits.Administrator)
  );
}

function uiId(kind, userId, topicKey) {
  const k = String(topicKey || "start");
  return `${TUTORIAL_UI_PREFIX}:${kind}:${userId}:${encodeURIComponent(k)}`;
}

function parseUiId(customId) {
  const parts = String(customId || "").split(":");
  if (parts.length < 4) return null;
  if (parts[0] !== TUTORIAL_UI_PREFIX) return null;
  let topicKey = "start";
  try {
    topicKey = decodeURIComponent(parts.slice(3).join(":"));
  } catch {}
  return { kind: parts[1], userId: parts[2], topicKey };
}

function buildBaseEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(String(description || "").slice(0, 4096))
    .setColor(Colors.INFO)
    .setTimestamp();
}

function checklistLine(status, text) {
  const tag = status === "ok" ? "[OK]" : status === "todo" ? "[TODO]" : "[WARN]";
  return `${tag} ${text}`.slice(0, 240);
}

async function buildQuickstartChecklist(interaction) {
  if (!interaction.inGuild?.()) return null;

  const guildId = interaction.guildId;
  const lines = [];

  const canManage = hasManageGuild(interaction);
  lines.push(
    canManage
      ? checklistLine("ok", "Admin access: Manage Server detected.")
      : checklistLine("warn", "Admin access: missing Manage Server (some setup actions are admin-only).")
  );

  try {
    const poolId = await getGuildSelectedPool(guildId);
    const pool = await fetchPool(poolId).catch(() => null);
    if (pool) {
      const name = pool.name ? ` (${String(pool.name).slice(0, 48)})` : "";
      lines.push(checklistLine("ok", `Pool selected: \`${poolId}\`${name}.`));
    } else if (poolId) {
      lines.push(checklistLine("warn", `Pool selected: \`${poolId}\` (not found). Open Pools UI to pick a valid pool.`));
    } else {
      lines.push(checklistLine("todo", "Pool selected: not set. Open Pools UI to pick one."));
    }
  } catch {
    lines.push(checklistLine("warn", "Pool selected: unable to read guild default pool (try Refresh)."));
  }

  try {
    const mgr = global.agentManager;
    if (!mgr?.liveAgents?.values) {
      lines.push(checklistLine("warn", "Agents: controller not ready yet (try Refresh in a few seconds)."));
    } else {
      let inGuild = 0;
      let ready = 0;
      for (const a of mgr.liveAgents.values()) {
        if (!a?.guildIds?.has?.(guildId)) continue;
        inGuild++;
        if (a.ready) ready++;
      }
      if (inGuild === 0) {
        lines.push(checklistLine("todo", "Agents: none deployed to this server yet (use Deploy UI)."));
      } else if (ready === 0) {
        lines.push(checklistLine("warn", `Agents: ${inGuild} present but none are ready yet.`));
      } else {
        lines.push(checklistLine("ok", `Agents: ${ready}/${inGuild} ready in this server.`));
      }
    }
  } catch {
    lines.push(checklistLine("warn", "Agents: unable to read live agent status."));
  }

  try {
    const voice = await getVoiceState(guildId);
    const lobbies = voice?.lobbies && typeof voice.lobbies === "object" ? Object.values(voice.lobbies) : [];
    const enabled = lobbies.filter(l => l?.enabled).length;
    if (!lobbies.length) {
      lines.push(checklistLine("todo", "VoiceMaster (auto rooms): no lobbies configured (run `/voice setup`)."));
    } else if (enabled === 0) {
      lines.push(checklistLine("warn", `VoiceMaster (auto rooms): ${lobbies.length} lobby(s) configured but none enabled.`));
    } else {
      lines.push(checklistLine("ok", `VoiceMaster (auto rooms): ${enabled}/${lobbies.length} lobby(s) enabled.`));
    }

    if (voice) {
      ensureCustomVcsState(voice);
      const cfg = getCustomVcConfig(voice);
      if (!cfg?.enabled) {
        lines.push(checklistLine("todo", "Custom VCs (panel rooms): disabled (admins can enable with `/voice customs_setup enabled:true`)."));
      } else if (!cfg.categoryId) {
        lines.push(checklistLine("warn", "Custom VCs (panel rooms): enabled but category not set (`/voice customs_setup category:#...`)."));
      } else if (!cfg.panelMessageId) {
        lines.push(checklistLine("todo", "Custom VCs (panel rooms): panel not posted yet (`/voice customs_panel`)."));
      } else {
        lines.push(checklistLine("ok", "Custom VCs (panel rooms): enabled and panel is set."));
      }
    }
  } catch {
    lines.push(checklistLine("warn", "Voice: unable to read voice configuration."));
  }

  return lines.slice(0, 12).join("\n").slice(0, 1024);
}

async function buildV1Readiness(interaction) {
  if (!interaction.inGuild?.()) return null;

  const guildId = interaction.guildId;
  const isAdmin = hasManageGuild(interaction);
  const summary = [];
  const diagnostics = [];

  summary.push(checklistLine("ok", "Commands: permissions are enforced server-side (buttons, selects, modals)."));

  const me = interaction.guild?.members?.me ?? (await interaction.guild?.members?.fetchMe?.().catch(() => null));
  if (!me) {
    summary.push(checklistLine("warn", "Bot membership context unavailable (try Refresh)."));
  } else {
    summary.push(checklistLine("ok", "Bot is present in this server."));
  }

  try {
    const poolId = await getGuildSelectedPool(guildId);
    const pool = await fetchPool(poolId).catch(() => null);
    if (pool) summary.push(checklistLine("ok", `Pool: \`${poolId}\` selected.`));
    else summary.push(checklistLine("warn", `Pool: \`${poolId}\` selected but not found.`));
  } catch {
    summary.push(checklistLine("warn", "Pool: unable to resolve guild default."));
  }

  try {
    const mgr = global.agentManager;
    if (!mgr?.liveAgents?.values) {
      summary.push(checklistLine("warn", "Agents: controller not ready yet."));
    } else {
      let inGuild = 0;
      let ready = 0;
      for (const a of mgr.liveAgents.values()) {
        if (!a?.guildIds?.has?.(guildId)) continue;
        inGuild++;
        if (a.ready) ready++;
      }
      if (inGuild === 0) summary.push(checklistLine("todo", "Agents: none deployed to this server."));
      else if (ready === 0) summary.push(checklistLine("warn", `Agents: ${inGuild} present, none ready.`));
      else summary.push(checklistLine("ok", `Agents: ${ready}/${inGuild} ready.`));
      summary.push(checklistLine(ready > 0 ? "ok" : "todo", "Music: needs at least 1 ready agent in this server."));
    }
  } catch {
    summary.push(checklistLine("warn", "Agents: unable to read live state."));
  }

  try {
    const voice = await getVoiceState(guildId);
    const lobbies = voice?.lobbies && typeof voice.lobbies === "object" ? Object.entries(voice.lobbies) : [];
    const enabled = lobbies.filter(([, l]) => l?.enabled).length;

    if (!lobbies.length) summary.push(checklistLine("todo", "VoiceMaster: no lobbies configured."));
    else if (enabled === 0) summary.push(checklistLine("warn", "VoiceMaster: lobbies configured but none enabled."));
    else summary.push(checklistLine("ok", `VoiceMaster: ${enabled}/${lobbies.length} lobbies enabled.`));

    // Admin-only diagnostics: check bot perms per lobby category (best-effort).
    if (isAdmin && me && lobbies.length) {
      const missing = [];
      for (const [channelId, lobby] of lobbies.slice(0, 12)) {
        const catId = lobby?.categoryId;
        if (!lobby?.enabled) continue;
        const category =
          interaction.guild.channels.cache.get(catId) ??
          (await interaction.guild.channels.fetch(catId).catch(() => null));
        if (!category) {
          missing.push(`<#${channelId}>: category missing`);
          continue;
        }
        const perms = category.permissionsFor(me);
        const req = [
          ["ViewChannel", PermissionFlagsBits.ViewChannel],
          ["Connect", PermissionFlagsBits.Connect],
          ["ManageChannels", PermissionFlagsBits.ManageChannels],
          ["MoveMembers", PermissionFlagsBits.MoveMembers]
        ];
        const miss = req.filter(([, p]) => !perms?.has?.(p)).map(([n]) => n);
        if (miss.length) missing.push(`<#${channelId}>: missing ${miss.join(", ")}`);
      }
      if (missing.length) diagnostics.push(checklistLine("warn", `VoiceMaster diagnostics:\n${missing.slice(0, 6).join("\n")}`));
      else diagnostics.push(checklistLine("ok", "VoiceMaster diagnostics: bot permissions look good for enabled lobbies."));
    }

    if (voice) {
      ensureCustomVcsState(voice);
      const cfg = getCustomVcConfig(voice);
      if (!cfg?.enabled) summary.push(checklistLine("todo", "Custom VCs: disabled."));
      else if (!cfg.categoryId) summary.push(checklistLine("warn", "Custom VCs: enabled but category not set."));
      else summary.push(checklistLine("ok", "Custom VCs: enabled."));

      if (isAdmin && me && cfg?.enabled && cfg?.categoryId) {
        const category =
          interaction.guild.channels.cache.get(cfg.categoryId) ??
          (await interaction.guild.channels.fetch(cfg.categoryId).catch(() => null));
        if (!category) diagnostics.push(checklistLine("warn", "Custom VCs diagnostics: category missing."));
        else {
          const perms = category.permissionsFor(me);
          const ok = perms?.has?.(PermissionFlagsBits.ManageChannels);
          diagnostics.push(checklistLine(ok ? "ok" : "warn", `Custom VCs diagnostics: bot ManageChannels in category: ${ok ? "yes" : "no"}.`));
        }
      }
    }
  } catch {
    summary.push(checklistLine("warn", "Voice: unable to read configuration."));
  }

  return {
    summary: summary.slice(0, 14).join("\n").slice(0, 1024),
    diagnostics: diagnostics.length ? diagnostics.join("\n").slice(0, 1024) : null
  };
}

function topicContent(topicKey) {
  const inGuildNote = "Tip: run this inside a server for the full UI (deploy planning, invite links, guild defaults).";

  if (topicKey === "pools") {
    return {
      title: "Tutorial: Agent Pools",
      body: [
        "Chopsticks uses **pools** to manage multiple bot identities (agents) safely at scale.",
        "",
        "**Typical flow:**",
        "1) Create/select a pool (`/pools setup` or `/pools ui`).",
        "2) Register identities into a pool (`/agents add_token`).",
        "3) Mark identities active (`/agents update_token_status`).",
        "4) Deploy to a server (`/agents deploy` or Deploy UI).",
        "",
        inGuildNote
      ].join("\n")
    };
  }

  if (topicKey === "voice") {
    return {
      title: "Tutorial: VoiceMaster (Auto Rooms)",
      body: [
        "VoiceMaster creates **temporary voice rooms** from a lobby and gives owners controls via dashboards.",
        "",
        "**Typical flow:**",
        "1) Configure lobbies (`/voice setup`).",
        "2) Join the lobby VC to spawn a room.",
        "3) Use the **Voice Console** for control buttons and delivery preferences.",
        "",
        "**No DM?** If DM delivery fails, Chopsticks will show an in-server fallback panel.",
        "If spawning fails, use `/voice status` then **Spawn Diagnostics**."
      ].join("\n")
    };
  }

  if (topicKey === "customvcs") {
    return {
      title: "Tutorial: Custom VCs (In development)",
      body: [
        "Custom VCs let members request an on-demand voice channel with controls.",
        "",
        "Note: **Custom VCs are separate from VoiceMaster**. You can enable either, both, or neither.",
        "",
        "**Flow:**",
        "1) Use the **Custom VCs** panel (admins can post one with `/voice customs_panel`).",
        "2) Request a room: name, size, bitrate.",
        "3) Choose **Public** or **Private** (DM prompt by default; fallback shown in-server if DMs are blocked).",
        "4) Use **Open Controls** to manage guestlist and restrictions.",
        "",
        "**Rules:**",
        "• Private rooms: only guestlist + Voice Mods can join.",
        "• Customs are deleted when the host leaves."
      ].join("\n")
    };
  }

  if (topicKey === "v1") {
    return {
      title: "V1 Readiness (In development)",
      body: [
        "This page is a **deployment checklist** for public servers.",
        "",
        "Use **Refresh** after you deploy agents, configure VoiceMaster, or change categories/permissions.",
        "",
        "Admin-only diagnostics will appear when you have `Manage Server`."
      ].join("\n")
    };
  }

  if (topicKey === "music") {
    return {
      title: "Tutorial: Music",
      body: [
        "Music runs through pooled agents (voice workers).",
        "",
        "**Quick checks:**",
        "1) `/agents status` (are there agents in your server?)",
        "2) `/music play <query>`",
        "3) If it says all busy: deploy more agents or wait for idle release.",
        "",
        "**Playlists (drop channels):**",
        "1) Admins: `/music playlist panel` -> Create -> Bind Drop Channel -> (optional) Panel Message",
        "2) Admins: post a single **Playlist Hub** message so users can self-serve (`/music playlist panel` -> Hub Message)",
        "2) Users: drop audio files or links in the drop channel to add tracks",
        "   Tip: type `q: keywords` to add a search query item",
        "3) In VC: `/music queue` -> press **Playlists** -> queue a track from dropdowns",
        "",
        "Use Pools UI to see invite availability and the reason for gaps."
      ].join("\n")
    };
  }

  if (topicKey === "moderation") {
    return {
      title: "Tutorial: Moderation",
      body: [
        "**Core tools:** purge, warn, timeout, ban, locks/slowmode.",
        "",
        "**Recommended flow:**",
        "1) Use `/purge` for cleanup (buttons where available).",
        "2) Use `/warn` and `/timeout` for escalation.",
        "3) Use `/modlogs` + `/logs` for visibility and auditability."
      ].join("\n")
    };
  }

  if (topicKey === "troubleshooting") {
    return {
      title: "Tutorial: Troubleshooting",
      body: [
        "**DM delivery fails**",
        "• Discord blocks bots when a user disables DMs from server members.",
        "• Chopsticks will fall back to an in-server panel when possible.",
        "",
        "**VoiceMaster room won't spawn**",
        "• Run `/voice status` then press **Spawn Diagnostics**.",
        "• Ensure bot has `Manage Channels` + `Move Members` in the lobby category.",
        "",
        "**Deploy UI / Invite Links not available**",
        "• These are admin surfaces: require `Manage Server`.",
        "• Use Pools UI for read-only navigation if you are not an admin."
      ].join("\n")
    };
  }

  return {
    title: "Chopsticks Tutorials",
    body: [
      "Chopsticks is a **controller bot** + **deployable agent fleet** platform.",
      "You can scale voice/music/game workloads without collapsing everything into one bot identity.",
      "",
      "**Start with this sequence:**",
      "1) Admins: run `/setup wizard` for core server modules (welcome/starboard/modlogs/tickets).",
      "2) Open **Pools UI** and pick a pool.",
      "3) Admins: open **Deploy UI** and generate invite links for agents.",
      "4) Voice: pick **VoiceMaster (auto rooms)** and/or **Custom VCs (panel rooms)**, then follow the topic guides.",
      "",
      "Use the dropdown below to drill into a topic."
    ].join("\n")
  };
}

async function buildTutorialEmbed(topicKey, interaction) {
  const topic = topicContent(topicKey);
  const embed = buildBaseEmbed(topic.title, topic.body);
  if (!interaction.inGuild()) {
    embed.addFields({
      name: "Server Context",
      value: "Some controls require a server context (deploy planning, guild defaults, voice console).",
      inline: false
    });
    embed.setFooter({ text: "In development" });
  } else if (topicKey === "start") {
    const checklist = await buildQuickstartChecklist(interaction);
    if (checklist) {
      embed.addFields({
        name: "Quickstart Checklist",
        value: checklist,
        inline: false
      });
    }
    embed.setFooter({ text: "In development" });
  } else if (topicKey === "v1") {
    const v1 = await buildV1Readiness(interaction);
    if (v1?.summary) {
      embed.addFields({ name: "V1 Checklist", value: v1.summary, inline: false });
    }
    if (v1?.diagnostics && hasManageGuild(interaction)) {
      embed.addFields({ name: "Admin Diagnostics", value: v1.diagnostics, inline: false });
    }
    embed.setFooter({ text: "In development" });
  }
  return embed;
}

function buildTutorialComponents(interaction, userId, topicKey) {
  const select = new StringSelectMenuBuilder()
    .setCustomId(uiId("select", userId, topicKey))
    .setPlaceholder("Pick a tutorial topic")
    .addOptions(
      TOPICS.map(t => ({
        label: t.label,
        value: t.key,
        description: t.description,
        default: t.key === topicKey
      }))
    );

  const row1 = new ActionRowBuilder().addComponents(select);

  const inGuild = interaction.inGuild();
  const canManage = inGuild && hasManageGuild(interaction);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(uiId("open_pools", userId, topicKey))
      .setLabel("Open Pools UI")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!inGuild),
    new ButtonBuilder()
      .setCustomId(uiId("open_deploy", userId, topicKey))
      .setLabel("Open Deploy UI")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canManage),
    new ButtonBuilder()
      .setCustomId(uiId("open_advisor", userId, topicKey))
      .setLabel("Open Advisor UI")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!canManage),
    new ButtonBuilder()
      .setCustomId(uiId("open_voice_console", userId, topicKey))
      .setLabel("Voice Console")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!inGuild),
    new ButtonBuilder()
      .setCustomId(uiId("refresh", userId, topicKey))
      .setLabel("Refresh")
      .setStyle(ButtonStyle.Secondary)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(uiId("open_customvcs", userId, topicKey))
      .setLabel("Custom VCs Panel")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!inGuild),
    new ButtonBuilder()
      .setCustomId(`voiceui:spawn_diag:${userId}:${interaction.guildId || "0"}`)
      .setLabel("Spawn Diagnostics")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!inGuild)
  );

  return [row1, row2, row3];
}

async function renderTutorial(interaction, { update = false, topicKey = "start" } = {}) {
  const embed = await buildTutorialEmbed(topicKey, interaction);
  const components = buildTutorialComponents(interaction, interaction.user.id, topicKey);
  const payload = { embeds: [embed], components, flags: MessageFlags.Ephemeral };

  if (update) return interaction.update(payload);
  return interaction.reply(payload);
}

export const data = new SlashCommandBuilder()
  .setName("tutorials")
  .setDescription("Interactive tutorials and quick-start control center");

export async function execute(interaction) {
  await renderTutorial(interaction, { update: false, topicKey: "start" });
}

export async function handleSelect(interaction) {
  if (!interaction.isStringSelectMenu?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed || parsed.kind !== "select") return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({
      embeds: [buildBaseEmbed("Panel Locked", "This tutorial panel belongs to another user.").setColor(Colors.ERROR)],
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  const value = interaction.values?.[0];
  const topicKey = TOPICS.some(t => t.key === value) ? value : "start";
  await renderTutorial(interaction, { update: true, topicKey });
  return true;
}

export async function handleButton(interaction) {
  if (!interaction.isButton?.()) return false;
  const parsed = parseUiId(interaction.customId);
  if (!parsed) return false;

  if (parsed.userId !== interaction.user.id) {
    await interaction.reply({
      embeds: [buildBaseEmbed("Panel Locked", "This tutorial panel belongs to another user.").setColor(Colors.ERROR)],
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (parsed.kind === "refresh") {
    await renderTutorial(interaction, { update: true, topicKey: parsed.topicKey || "start" });
    return true;
  }

  if (!interaction.inGuild()) {
    await interaction.reply({
      embeds: [buildBaseEmbed("Guild Only", "This action needs a server context.").setColor(Colors.ERROR)],
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  if (parsed.kind === "open_pools") {
    // Reuse /pools ui behavior without forcing users to type.
    // poolsExecute expects options.getSubcommand(); supply minimal shim.
    interaction.options = interaction.options || {};
    interaction.options.getSubcommand = () => "ui";
    await poolsExecute(interaction);
    return true;
  }

  if (parsed.kind === "open_deploy") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        embeds: [buildBaseEmbed("Permission Required", "You need `Manage Server` to open Deploy UI.").setColor(Colors.ERROR)],
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    await openDeployUiHandoff(interaction, {});
    return true;
  }

  if (parsed.kind === "open_advisor") {
    if (!hasManageGuild(interaction)) {
      await interaction.reply({
        embeds: [buildBaseEmbed("Permission Required", "You need `Manage Server` to open Advisor UI.").setColor(Colors.ERROR)],
        flags: MessageFlags.Ephemeral
      });
      return true;
    }
    await openAdvisorUiHandoff(interaction, {});
    return true;
  }

  if (parsed.kind === "open_voice_console") {
    await showVoiceConsole(interaction);
    return true;
  }

  if (parsed.kind === "open_customvcs") {
    const voice = await getVoiceState(interaction.guildId);
    ensureCustomVcsState(voice);
    const cfg = getCustomVcConfig(voice);
    await interaction.reply({
      ...buildCustomVcPanelMessage(cfg),
      flags: MessageFlags.Ephemeral
    });
    return true;
  }

  return false;
}
