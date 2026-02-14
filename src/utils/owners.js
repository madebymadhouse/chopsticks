export function getBotOwnerIds() {
  const ids = new Set();
  const single = String(process.env.BOT_OWNER_ID || "").trim();
  if (single) ids.add(single);

  const list = String(process.env.BOT_OWNER_IDS || "")
    .split(",")
    .map(v => v.trim())
    .filter(Boolean);

  for (const id of list) ids.add(id);
  return ids;
}

export function isBotOwner(userId) {
  if (!userId) return false;
  return getBotOwnerIds().has(String(userId));
}
