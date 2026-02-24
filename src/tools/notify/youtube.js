// src/tools/notify/youtube.js
// Polls YouTube RSS feeds for new video uploads (no API key needed).

import { EmbedBuilder } from "discord.js";
import { loadGuildData } from "../../utils/storage.js";

// Track last-seen video IDs: Map<guildId:channelId, videoId>
const lastSeen = new Map();

/**
 * Fetch the latest video from a YouTube channel RSS feed.
 * @param {string} channelId - YouTube channel ID (starts with UC...)
 * @returns {{ id, title, url, author, publishedAt } | null}
 */
async function fetchLatestVideo(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const xml = await res.text();

  // Extract the first entry
  const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entryMatch) return null;
  const entry = entryMatch[1];

  const getId    = (tag) => entry.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`))?.[1] ?? null;
  const videoId  = entry.match(/yt:videoId>([^<]+)</)?.[1] ?? null;
  const title    = getId("title");
  const author   = xml.match(/<name>([^<]+)<\/name>/)?.[1] ?? null;
  const published = getId("published");

  if (!videoId) return null;
  return {
    id: videoId,
    title: title ? decodeXmlEntities(title) : "New Video",
    url: `https://www.youtube.com/watch?v=${videoId}`,
    author: author ? decodeXmlEntities(author) : channelId,
    publishedAt: published ? new Date(published) : new Date(),
  };
}

function decodeXmlEntities(str) {
  return str.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/**
 * Poll all guilds for new YouTube videos and send notifications.
 */
export async function pollYouTubeNotifications(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const gd = await loadGuildData(guild.id).catch(() => null);
      const channels = gd?.notify?.youtube ?? [];
      if (!channels.length) continue;
      const notifyChannelId = gd.notify?.channelId;
      if (!notifyChannelId) continue;

      const notifyChannel = guild.channels.cache.get(notifyChannelId);
      if (!notifyChannel?.isTextBased()) continue;

      for (const ytChannel of channels) {
        try {
          const video = await fetchLatestVideo(ytChannel.channelId);
          if (!video) continue;

          const key = `${guild.id}:${ytChannel.channelId}`;
          if (lastSeen.get(key) === video.id) continue; // no new video
          lastSeen.set(key, video.id);

          // Only notify on init after first successful fetch
          if (!ytChannel._seenInit) {
            ytChannel._seenInit = true;
            continue;
          }

          const customMsg = ytChannel.message ?? gd.notify?.youtubeMessage ?? "📺 **{author}** uploaded a new video: **{title}**";
          const content = customMsg
            .replace("{author}", video.author)
            .replace("{title}", video.title)
            .replace("{url}", video.url);

          const embed = new EmbedBuilder()
            .setTitle(video.title)
            .setURL(video.url)
            .setDescription(`New upload from **${video.author}**`)
            .setColor(0xFF0000)
            .setTimestamp(video.publishedAt);

          const pingRoleId = ytChannel.pingRoleId ?? gd.notify?.youtubePingRoleId;
          const pingContent = pingRoleId ? `<@&${pingRoleId}> ${content}` : content;

          await notifyChannel.send({ content: pingContent, embeds: [embed] }).catch(() => null);
        } catch { /* per-channel error */ }
      }
    } catch { /* per-guild error */ }
  }
}
