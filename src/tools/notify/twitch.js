// src/tools/notify/twitch.js
// Polls the Twitch Helix API for live streams and sends notifications.
// Requires TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET env vars.

import { EmbedBuilder } from "discord.js";
import { loadGuildData } from "../../utils/storage.js";

const TWITCH_API = "https://api.twitch.tv/helix";
let twitchToken = null;
let tokenExpiry = 0;

async function getTwitchToken() {
  if (twitchToken && Date.now() < tokenExpiry) return twitchToken;
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );
  if (!res.ok) return null;
  const data = await res.json();
  twitchToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return twitchToken;
}

async function fetchStreamData(userLogins) {
  const token = await getTwitchToken();
  if (!token) return [];
  const clientId = process.env.TWITCH_CLIENT_ID;
  const query = userLogins.map(l => `user_login=${encodeURIComponent(l)}`).join("&");
  const res = await fetch(`${TWITCH_API}/streams?${query}`, {
    headers: { "Client-ID": clientId, "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

// Already-notified stream IDs: Map<guildId:login, streamId>
const notifiedStreams = new Map();

/**
 * Poll all guilds for Twitch live streams and send notifications.
 */
export async function pollTwitchNotifications(client) {
  if (!process.env.TWITCH_CLIENT_ID) return;

  for (const guild of client.guilds.cache.values()) {
    try {
      const gd = await loadGuildData(guild.id).catch(() => null);
      const streamers = gd?.notify?.twitch ?? [];
      if (!streamers.length) continue;
      const notifyChannelId = gd.notify?.channelId;
      if (!notifyChannelId) continue;

      const channel = guild.channels.cache.get(notifyChannelId);
      if (!channel?.isTextBased()) continue;

      const logins = streamers.map(s => s.login);
      const liveStreams = await fetchStreamData(logins);

      for (const stream of liveStreams) {
        const key = `${guild.id}:${stream.user_login.toLowerCase()}`;
        if (notifiedStreams.get(key) === stream.id) continue; // already notified
        notifiedStreams.set(key, stream.id);

        const streamer = streamers.find(s => s.login.toLowerCase() === stream.user_login.toLowerCase());
        const customMsg = streamer?.message ?? gd.notify?.twitchMessage ?? `🔴 **{streamer}** is live! **{title}**`;
        const content = customMsg
          .replace("{streamer}", stream.user_name)
          .replace("{title}", stream.title)
          .replace("{game}", stream.game_name ?? "Unknown")
          .replace("{url}", `https://twitch.tv/${stream.user_login}`);

        const embed = new EmbedBuilder()
          .setTitle(`${stream.user_name} is live on Twitch!`)
          .setURL(`https://twitch.tv/${stream.user_login}`)
          .setDescription(stream.title)
          .setColor(0x9146FF)
          .addFields(
            { name: "Game", value: stream.game_name || "N/A", inline: true },
            { name: "Viewers", value: String(stream.viewer_count), inline: true },
          )
          .setImage(stream.thumbnail_url.replace("{width}", "1280").replace("{height}", "720"))
          .setTimestamp();

        const pingRoleId = streamer?.pingRoleId ?? gd.notify?.twitchPingRoleId;
        const pingContent = pingRoleId ? `<@&${pingRoleId}> ${content}` : content;

        await channel.send({ content: pingContent, embeds: [embed] }).catch(() => null);
      }

      // Clear stale entries for offline streamers
      for (const s of streamers) {
        const key = `${guild.id}:${s.login.toLowerCase()}`;
        const isLive = liveStreams.some(ls => ls.user_login.toLowerCase() === s.login.toLowerCase());
        if (!isLive) notifiedStreams.delete(key);
      }
    } catch { /* per-guild error must not stop others */ }
  }
}
