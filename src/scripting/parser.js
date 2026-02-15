function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function parseScriptDsl(input) {
  if (isObject(input)) return cloneJson(input);

  const raw = String(input || "").trim();
  if (!raw) throw new Error("Script DSL is required.");

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Script DSL must be valid JSON.");
  }

  if (!isObject(parsed)) {
    throw new Error("Script DSL root must be a JSON object.");
  }

  return parsed;
}

