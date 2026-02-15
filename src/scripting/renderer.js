import { validateScriptDefinition } from "./validator.js";

function normalizeToken(token) {
  const key = String(token || "").trim();
  if (!/^[a-zA-Z0-9_.-]+$/.test(key)) return null;
  return key;
}

function replaceTokens(input, variables) {
  const raw = String(input || "");
  return raw.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_m, captured) => {
    const key = normalizeToken(captured);
    if (!key) return "";
    return String(variables[key] ?? "");
  });
}

function buildVariables(context = {}, scriptVars = {}) {
  const now = new Date();
  const user = context.user || {};
  const guild = context.guild || {};
  const channel = context.channel || {};

  const builtins = {
    "user.id": String(user.id || ""),
    "user.name": String(user.username || user.name || ""),
    "user.mention": user.id ? `<@${user.id}>` : "",
    "guild.id": String(guild.id || ""),
    "guild.name": String(guild.name || ""),
    "channel.id": String(channel.id || ""),
    "channel.name": String(channel.name || ""),
    "time.iso": now.toISOString(),
    "time.unix": String(Math.floor(now.getTime() / 1000))
  };

  return { ...builtins, ...scriptVars };
}

function renderEmbeds(embeds, vars) {
  return embeds.map(embed => {
    const out = {};
    if (embed.title) out.title = replaceTokens(embed.title, vars);
    if (embed.description) out.description = replaceTokens(embed.description, vars);
    if (Number.isFinite(Number(embed.color))) out.color = Number(embed.color);
    if (Array.isArray(embed.fields) && embed.fields.length) {
      out.fields = embed.fields.map(field => ({
        name: replaceTokens(field.name, vars),
        value: replaceTokens(field.value, vars),
        inline: Boolean(field.inline)
      }));
    }
    return out;
  });
}

function renderButtons(buttons, vars) {
  if (!buttons.length) return [];
  return [
    {
      type: 1,
      components: buttons.map(button => ({
        type: 2,
        style: 5,
        label: replaceTokens(button.label, vars),
        url: replaceTokens(button.url, vars)
      }))
    }
  ];
}

export function renderScriptDefinition(input, context = {}) {
  const definition = validateScriptDefinition(input);
  const variables = buildVariables(context, definition.variables);

  const content = replaceTokens(definition.message.content, variables);
  const embeds = renderEmbeds(definition.message.embeds, variables);
  const components = renderButtons(definition.message.buttons, variables);

  const payload = {};
  if (content) payload.content = content;
  if (embeds.length) payload.embeds = embeds;
  if (components.length) payload.components = components;

  return {
    trigger: definition.trigger,
    permissions: definition.permissions,
    payload,
    variables
  };
}

