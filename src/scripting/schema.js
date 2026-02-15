export const SCRIPT_SCHEMA_VERSION = 1;

export const SCRIPT_TRIGGER_TYPES = new Set(["command", "schedule", "event"]);

export const SCRIPT_LIMITS = {
  name: 64,
  triggerValue: 128,
  content: 2000,
  embeds: 3,
  embedTitle: 256,
  embedDescription: 4096,
  embedFields: 10,
  embedFieldName: 256,
  embedFieldValue: 1024,
  buttons: 5,
  buttonLabel: 80,
  roles: 25
};

export function defaultScriptDefinition() {
  return {
    version: SCRIPT_SCHEMA_VERSION,
    trigger: { type: "command", value: null },
    permissions: { mode: "admin", roleIds: [] },
    message: { content: "", embeds: [], buttons: [] },
    variables: {}
  };
}

