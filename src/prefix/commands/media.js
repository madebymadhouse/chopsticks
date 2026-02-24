// src/prefix/commands/media.js
// Prefix command counterparts for media/info slash commands

import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { httpRequest } from "../../utils/httpFetch.js";
import { botLogger } from "../../utils/modernLogger.js";
import { sanitizeString } from "../../utils/validation.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const c = hex.replace("#", "");
  const n = parseInt(c, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

const VALID_JOKE_CATEGORIES = new Set(["Programming", "Misc", "Dark", "Pun", "Spooky", "Christmas"]);

const FALLBACK_ROASTS = [
  "Their WiFi password is 'password123' — and they're proud of it.",
  "They use Internet Explorer... unironically.",
  "Their GitHub is just a long list of 'initial commit' entries.",
  "The only thing they've ever committed to is a 60-day free trial that auto-renewed.",
  "They once opened a terminal and immediately googled 'how to close a terminal'.",
  "Their README just says 'TODO: write readme'.",
  "They reply to DMs with 'k' and think that's a full conversation.",
  "They muted the server notifications but still complain about missing announcements.",
  "Their code is so spaghetti that even Italian grandmothers are confused.",
  "They joined 47 servers and haven't talked in any of them.",
];

const BANNED_IMAGINE = /\b(nude|naked|nsfw|porn|sexual|sex|gore|violent|blood|weapon|terrorist|bomb)\b/i;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export default [
  // 1. !fact
  {
    name: "fact",
    aliases: ["facts", "interesting"],
    description: "Random interesting fact",
    rateLimit: 10000,
    execute: async (message) => {
      try {
        let text = "The average person walks 100,000 miles in a lifetime.";
        try {
          const { statusCode, body } = await httpRequest(
            "uselessfacts",
            "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
            { headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0", Accept: "application/json" } }
          );
          if (statusCode === 200) {
            const data = await body.json();
            if (data?.text) text = data.text;
          }
        } catch (err) {
          botLogger.warn({ err }, "[prefix:fact] fetch failed — using fallback");
        }
        const embed = new EmbedBuilder()
          .setTitle("🔬 Did You Know?")
          .setDescription(text)
          .setColor(0x5865F2);
        await message.reply({ embeds: [embed] });
      } catch (err) {
        botLogger.error({ err }, "[prefix:fact] execute error");
        await message.reply("❌ Couldn't fetch a fact right now. Try again later.");
      }
    },
  },

  // 2. !dadjoke
  {
    name: "dadjoke",
    aliases: ["dj", "dad", "pun"],
    description: "Random dad joke 🥁",
    rateLimit: 8000,
    execute: async (message) => {
      try {
        let joke = "Why don't scientists trust atoms? Because they make up everything!";
        try {
          const { statusCode, body } = await httpRequest(
            "dadjoke",
            "https://icanhazdadjoke.com/",
            {
              headers: {
                "User-Agent": "Chopsticks-Discord-Bot/1.0",
                Accept: "application/json",
              },
            }
          );
          if (statusCode === 200) {
            const data = await body.json();
            if (data?.joke) joke = data.joke;
          }
        } catch (err) {
          botLogger.warn({ err }, "[prefix:dadjoke] fetch failed — using fallback");
        }
        const embed = new EmbedBuilder()
          .setTitle("🥁 Dad Joke")
          .setDescription(joke)
          .setColor(0xFF9F43);
        await message.reply({ embeds: [embed] });
      } catch (err) {
        botLogger.error({ err }, "[prefix:dadjoke] execute error");
        await message.reply("❌ Couldn't fetch a joke right now. Try again later.");
      }
    },
  },

  // 3. !joke [category]
  {
    name: "joke",
    aliases: ["jokes", "j"],
    description: "Random joke. Usage: !joke [Programming|Misc|Dark|Pun|Spooky|Christmas]",
    rateLimit: 8000,
    execute: async (message, args) => {
      try {
        const rawCat = args[0] ? args[0][0].toUpperCase() + args[0].slice(1).toLowerCase() : null;
        const category = rawCat && VALID_JOKE_CATEGORIES.has(rawCat) ? rawCat : "Any";
        let description = "Why did the programmer quit? Because they didn't get arrays.";
        try {
          const url = `https://v2.jokeapi.dev/joke/${category}?blacklistFlags=nsfw,racist,sexist&type=twopart,single&safe-mode`;
          const { statusCode, body } = await httpRequest("jokeapi", url, {
            headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
          });
          if (statusCode === 200) {
            const data = await body.json();
            if (!data.error) {
              description = data.type === "twopart"
                ? `${data.setup}\n\n||${data.delivery}||`
                : data.joke;
            }
          }
        } catch (err) {
          botLogger.warn({ err }, "[prefix:joke] fetch failed — using fallback");
        }
        const embed = new EmbedBuilder()
          .setTitle("😄 Joke")
          .setDescription(description)
          .setColor(0xFEE75C);
        await message.reply({ embeds: [embed] });
      } catch (err) {
        botLogger.error({ err }, "[prefix:joke] execute error");
        await message.reply("❌ Couldn't fetch a joke right now. Try again later.");
      }
    },
  },

  // 4. !wiki <query>
  {
    name: "wiki",
    aliases: ["wikipedia", "w", "search"],
    description: "Wikipedia summary. Usage: !wiki <query>",
    rateLimit: 5000,
    execute: async (message, args) => {
      try {
        const query = sanitizeString(args.join(" ")).trim();
        if (!query) return message.reply("Usage: !wiki <query>");
        try {
          const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
          const { statusCode, body } = await httpRequest("wikipedia", url, {
            headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
          });
          if (statusCode === 404) return message.reply(`❌ No Wikipedia article found for **${query}**.`);
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const data = await body.json();
          const description = (data.extract?.slice(0, 400) ?? "No summary available.") + "...";
          const embed = new EmbedBuilder()
            .setTitle(data.title)
            .setDescription(description)
            .setColor(0x6599FF)
            .setURL(data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`);
          if (data.thumbnail?.source) embed.setThumbnail(data.thumbnail.source);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:wiki] fetch failed");
          return message.reply("❌ No Wikipedia article found for that query.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:wiki] execute error");
        await message.reply("❌ Couldn't fetch Wikipedia data right now. Try again later.");
      }
    },
  },

  // 5. !github <username>
  {
    name: "github",
    aliases: ["gh", "git"],
    description: "GitHub profile info. Usage: !github <username>",
    rateLimit: 5000,
    execute: async (message, args) => {
      try {
        const query = sanitizeString(args[0] || "").trim();
        if (!query) return message.reply("Usage: !github <username>");
        try {
          const headers = {
            "User-Agent": "Chopsticks-Discord-Bot/1.0",
            Accept: "application/vnd.github+json",
          };
          if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
          const { statusCode, body } = await httpRequest(
            "github",
            `https://api.github.com/users/${query}`,
            { headers }
          );
          if (statusCode === 404) return message.reply("❌ GitHub user not found.");
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const data = await body.json();
          const embed = new EmbedBuilder()
            .setTitle(`🐙 ${data.login}`)
            .setURL(data.html_url)
            .setColor(0x24292e)
            .setThumbnail(data.avatar_url)
            .addFields(
              { name: "📦 Repos", value: String(data.public_repos), inline: true },
              { name: "👥 Followers", value: String(data.followers), inline: true },
              { name: "👣 Following", value: String(data.following), inline: true },
              { name: "📅 Joined", value: data.created_at.slice(0, 10), inline: true }
            );
          if (data.bio) embed.setDescription(data.bio.slice(0, 300));
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:github] fetch failed");
          return message.reply("❌ GitHub user not found.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:github] execute error");
        await message.reply("❌ Couldn't fetch GitHub data right now. Try again later.");
      }
    },
  },

  // 6. !anime <title>
  {
    name: "anime",
    aliases: ["ani", "manga"],
    description: "Search anime info. Usage: !anime <title>",
    rateLimit: 5000,
    execute: async (message, args) => {
      try {
        const title = sanitizeString(args.join(" ")).trim();
        if (!title) return message.reply("Usage: !anime <title>");
        const gqlQuery = `query ($search: String) { Media(search: $search, type: ANIME) {
          title { english romaji } episodes averageScore genres status
          coverImage { large } siteUrl description(asHtml: false)
        }}`;
        try {
          const { statusCode, body } = await httpRequest(
            "anilist",
            "https://graphql.anilist.co",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                "User-Agent": "Chopsticks-Discord-Bot/1.0",
              },
              body: JSON.stringify({ query: gqlQuery, variables: { search: title } }),
            }
          );
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const json = await body.json();
          const result = json?.data?.Media;
          if (!result) return message.reply("❌ No anime found for that title.");
          const name = result.title.english || result.title.romaji;
          const embed = new EmbedBuilder()
            .setTitle(name)
            .setColor(0x02a9ff)
            .setThumbnail(result.coverImage?.large ?? null)
            .addFields(
              { name: "📺 Episodes", value: String(result.episodes ?? "?"), inline: true },
              { name: "⭐ Score", value: result.averageScore ? `${result.averageScore}/100` : "N/A", inline: true },
              { name: "🏷️ Genres", value: result.genres?.slice(0, 3).join(", ") || "N/A", inline: true },
              { name: "📋 Status", value: result.status ?? "Unknown", inline: true }
            );
          if (result.description) {
            embed.setDescription(result.description.replace(/<[^>]+>/g, "").slice(0, 300));
          }
          if (result.siteUrl) embed.setURL(result.siteUrl);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:anime] fetch failed");
          return message.reply("❌ No anime found for that title.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:anime] execute error");
        await message.reply("❌ Couldn't fetch anime data right now. Try again later.");
      }
    },
  },

  // 7. !book <query>
  {
    name: "book",
    aliases: ["books", "novel", "read"],
    description: "Book info. Usage: !book <title or author>",
    rateLimit: 5000,
    execute: async (message, args) => {
      try {
        const query = sanitizeString(args.join(" ")).trim();
        if (!query) return message.reply("Usage: !book <title>");
        try {
          const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=key,title,author_name,first_publish_year,subject&limit=1`;
          const { statusCode, body } = await httpRequest("openlibrary", url, {
            headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
          });
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const data = await body.json();
          const doc = data.docs?.[0];
          if (!doc) return message.reply("❌ No book found for that query.");
          const workUrl = doc.key ? `https://openlibrary.org${doc.key}` : null;
          const embed = new EmbedBuilder()
            .setTitle(`📚 ${doc.title}`)
            .setColor(0x8B4513)
            .addFields(
              { name: "✍️ Author", value: doc.author_name?.[0] || "Unknown", inline: true },
              { name: "📅 Year", value: String(doc.first_publish_year ?? "Unknown"), inline: true },
              { name: "🏷️ Genres", value: doc.subject?.slice(0, 3).join(", ") || "N/A", inline: false }
            );
          if (workUrl) embed.setURL(workUrl);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:book] fetch failed");
          return message.reply("❌ No book found for that query.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:book] execute error");
        await message.reply("❌ Couldn't fetch book data right now. Try again later.");
      }
    },
  },

  // 8. !urban <term>
  {
    name: "urban",
    aliases: ["ud", "define", "slang"],
    description: "Urban Dictionary definition. Usage: !urban <term>",
    rateLimit: 5000,
    execute: async (message, args) => {
      try {
        const term = sanitizeString(args.join(" ")).trim();
        if (!term) return message.reply("Usage: !urban <term>");
        if (!message.channel?.nsfw) {
          return message.reply("⚠️ This command can only be used in NSFW channels.");
        }
        try {
          const url = `https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`;
          const { statusCode, body } = await httpRequest("urbandictionary", url, {
            headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
          });
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const data = await body.json();
          const result = data.list?.[0];
          if (!result) return message.reply("❌ No definition found for that term.");
          const def = result.definition.replace(/\[([^\]]+)\]/g, "$1").slice(0, 400);
          const embed = new EmbedBuilder()
            .setTitle(`📖 ${result.word}`)
            .setDescription(def.replace(/\r\n|\r|\n/g, "\n"))
            .setColor(0xFF4500);
          if (result.example) {
            embed.addFields({
              name: "Example",
              value: result.example.replace(/\[([^\]]+)\]/g, "$1").slice(0, 200),
            });
          }
          if (result.permalink) embed.setURL(result.permalink);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:urban] fetch failed");
          return message.reply("❌ No definition found for that term.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:urban] execute error");
        await message.reply("❌ Couldn't fetch Urban Dictionary data right now.");
      }
    },
  },

  // 9. !apod
  {
    name: "apod",
    aliases: ["nasa", "space", "astronomy"],
    description: "NASA Astronomy Picture of the Day",
    rateLimit: 30000,
    execute: async (message) => {
      try {
        const key = process.env.NASA_API_KEY || "DEMO_KEY";
        try {
          const { statusCode, body } = await httpRequest(
            "apod",
            `https://api.nasa.gov/planetary/apod?api_key=${key}&thumbs=true`,
            { headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" } }
          );
          if (statusCode !== 200) throw new Error(`HTTP ${statusCode}`);
          const data = await body.json();
          if (data.error) throw new Error(data.error.message ?? "API error");
          const image = data.media_type === "video" ? data.thumbnail_url : data.url;
          const embed = new EmbedBuilder()
            .setTitle(`🔭 ${data.title}`)
            .setDescription(data.explanation?.slice(0, 400) ?? "No description.")
            .setColor(0x1a1a2e)
            .setFooter({ text: data.date });
          if (image) embed.setImage(image);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:apod] fetch failed");
          return message.reply("❌ Couldn't fetch APOD right now.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:apod] execute error");
        await message.reply("❌ Couldn't fetch APOD right now.");
      }
    },
  },

  // 10. !steam <profile>
  {
    name: "steam",
    aliases: ["st", "steamprofile"],
    description: "Steam profile lookup. Usage: !steam <vanity URL or steamid64>",
    rateLimit: 10000,
    execute: async (message, args) => {
      try {
        const profile = sanitizeString(args[0] || "").trim();
        if (!profile) return message.reply("Usage: !steam <vanity URL or Steam ID>");
        const steamKey = process.env.STEAM_API_KEY;
        if (!steamKey) {
          return message.reply(
            "Steam lookup requires a `STEAM_API_KEY` environment variable. Ask the server admin."
          );
        }
        try {
          // Try resolving vanity URL first
          const isNumericId = /^\d{17,}$/.test(profile);
          let steamId = profile;
          if (!isNumericId) {
            const vanityUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${steamKey}&vanityurl=${encodeURIComponent(profile)}`;
            const { statusCode, body } = await httpRequest("steam", vanityUrl, {
              headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
            });
            if (statusCode === 200) {
              const data = await body.json();
              if (data?.response?.success === 1) steamId = data.response.steamid;
            }
          }
          const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamKey}&steamids=${steamId}`;
          const { statusCode: sc2, body: body2 } = await httpRequest("steam", summaryUrl, {
            headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" },
          });
          if (sc2 !== 200) throw new Error(`HTTP ${sc2}`);
          const json2 = await body2.json();
          const player = json2?.response?.players?.[0];
          if (!player) return message.reply("❌ Couldn't look up that Steam profile.");
          const embed = new EmbedBuilder()
            .setTitle(`🎮 ${player.personaname}`)
            .setURL(player.profileurl)
            .setColor(0x1b2838)
            .setThumbnail(player.avatarfull);
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:steam] fetch failed");
          return message.reply("❌ Couldn't look up that Steam profile.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:steam] execute error");
        await message.reply("❌ Couldn't look up that Steam profile.");
      }
    },
  },

  // 11. !color <hex>
  {
    name: "color",
    aliases: ["colour", "hex", "clr"],
    description: "Color info from hex code. Usage: !color <#hex>",
    rateLimit: 3000,
    execute: async (message, args) => {
      try {
        const raw = sanitizeString(args[0] || "").trim();
        if (!raw) return message.reply("Usage: !color <#RRGGBB>");
        const hex = raw.startsWith("#") ? raw : `#${raw}`;
        if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return message.reply("Usage: !color <#RRGGBB>");
        const [r, g, b] = hexToRgb(hex);
        const [h, s, l] = rgbToHsl(r, g, b);
        const colorInt = parseInt(hex.slice(1), 16);
        const embed = new EmbedBuilder()
          .setTitle("🎨 Color")
          .setColor(colorInt)
          .addFields(
            { name: "Hex", value: `\`${hex.toUpperCase()}\``, inline: true },
            { name: "RGB", value: `R: ${r} G: ${g} B: ${b}`, inline: true },
            { name: "HSL", value: `H: ${h}deg S: ${s}% L: ${l}%`, inline: true }
          );
        await message.reply({ embeds: [embed] });
      } catch (err) {
        botLogger.error({ err }, "[prefix:color] execute error");
        await message.reply("❌ Couldn't process that color. Use format: !color #RRGGBB");
      }
    },
  },

  // 12. !roast [@user]
  {
    name: "roast",
    description: "Roast yourself or another user. Usage: !roast [@user]",
    rateLimit: 60000,
    execute: async (message, args) => {
      try {
        // Resolve target from mention or fall back to message author
        let targetName = message.author.username;
        const mentionMatch = args[0]?.match(/^<@!?(\d+)>$/);
        if (mentionMatch) {
          const mentioned = message.mentions?.users?.get(mentionMatch[1]);
          if (mentioned) targetName = mentioned.displayName || mentioned.username;
        }
        let roastText = FALLBACK_ROASTS[Math.floor(Math.random() * FALLBACK_ROASTS.length)];
        try {
          const { generateText } = await import("../../utils/textLlm.js");
          const prompt = `Write a short, playful roast (2–3 sentences) for a Discord user named "${targetName}". Keep it funny and not genuinely mean.`;
          const system = "You are a witty comedian. Write short, funny, playful roasts. No slurs, no profanity.";
          const generated = await generateText({ prompt, system, guildId: message.guildId });
          if (generated && generated.trim().length >= 10) roastText = generated;
        } catch {}
        const isSelf = !mentionMatch || (mentionMatch && message.mentions?.users?.get(mentionMatch[1])?.id === message.author.id);
        const title = isSelf
          ? `🔥 ${message.author.username} roasted themselves`
          : `🔥 ${message.author.username} roasted ${targetName}`;
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(roastText)
          .setColor(0xFF4500);
        await message.reply({ embeds: [embed] });
      } catch (err) {
        botLogger.error({ err }, "[prefix:roast] execute error");
        await message.reply("❌ Couldn't generate a roast right now. Try again later.");
      }
    },
  },

  // 13. !imagine <prompt>
  {
    name: "imagine",
    description: "Generate an image from a prompt. Usage: !imagine <describe what you want to see>",
    rateLimit: 30000,
    execute: async (message, args) => {
      try {
        const prompt = sanitizeString(args.join(" ")).trim();
        if (!prompt) return message.reply("Usage: !imagine <describe what you want to see>");
        if (BANNED_IMAGINE.test(prompt)) return message.reply("❌ That prompt isn't allowed.");
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) return message.reply("Image generation requires a HuggingFace API key.");
        const waitMsg = await message.reply("🖼️ Generating your image, please wait...");
        let imageBuffer = null;
        let lastError = null;
        const models = [
          "black-forest-labs/FLUX.1-schnell",
          "stabilityai/stable-diffusion-xl-base-1.0",
          "runwayml/stable-diffusion-v1-5",
        ];
        for (const model of models) {
          try {
            const { statusCode, body } = await httpRequest(
              "huggingface",
              `https://api-inference.huggingface.co/models/${model}`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${hfKey}`,
                  "Content-Type": "application/json",
                  "X-Use-Cache": "false",
                },
                body: JSON.stringify({ inputs: prompt, parameters: { num_inference_steps: 4 } }),
                bodyTimeout: 65000,
                headersTimeout: 65000,
              }
            );
            if (statusCode === 503) { lastError = `Model ${model} is loading`; continue; }
            if (statusCode !== 200) { lastError = `Model ${model} returned ${statusCode}`; continue; }
            const buf = Buffer.from(await body.arrayBuffer());
            if (buf.length < 1000) { lastError = "Empty image response"; continue; }
            imageBuffer = buf;
            break;
          } catch (err) {
            lastError = err.message;
          }
        }
        if (!imageBuffer) {
          await waitMsg.edit(`❌ Image generation failed. ${lastError || "Try again later."}`);
          return;
        }
        const att = new AttachmentBuilder(imageBuffer, { name: "imagine.png" });
        const embed = new EmbedBuilder()
          .setTitle("🎨 AI Image Generated")
          .setDescription(`**Prompt:** ${prompt}`)
          .setImage("attachment://imagine.png")
          .setColor(0x5865F2);
        await message.channel.send({ embeds: [embed], files: [att] });
        await waitMsg.delete().catch(() => {});
      } catch (err) {
        botLogger.error({ err }, "[prefix:imagine] execute error");
        await message.reply("❌ Image generation failed. Try again later.");
      }
    },
  },

  // 14. !weather <city>
  {
    name: "weather",
    description: "Current weather. Usage: !weather <city or location>",
    rateLimit: 10000,
    execute: async (message, args) => {
      try {
        const location = sanitizeString(args.join(" ")).trim();
        if (!location) return message.reply("Usage: !weather <city>");
        try {
          const { getWeather, wmoLabel } = await import("../../utils/openmeteo.js");
          const weather = await getWeather(location);
          if (!weather) return message.reply(`❌ Couldn't fetch weather for that location.`);
          const [emoji, label] = wmoLabel(weather.current.wmo);
          const { temp, feels_like, humidity, wind_kph } = weather.current;
          const tempColor = temp >= 30 ? 0xff6b35 : temp >= 15 ? 0x5eb8ff : temp >= 0 ? 0x74b9ff : 0xa8d8ea;
          const embed = new EmbedBuilder()
            .setTitle(`🌤️ Weather in ${location}`)
            .setDescription(`**${emoji} ${label}**`)
            .setColor(tempColor)
            .addFields(
              { name: "🌡️ Temperature", value: `${temp}°C`, inline: true },
              { name: "🤔 Feels Like", value: `${feels_like}°C`, inline: true },
              { name: "💧 Humidity", value: `${humidity}%`, inline: true },
              { name: "💨 Wind Speed", value: `${wind_kph} km/h`, inline: true }
            );
          return message.reply({ embeds: [embed] });
        } catch (err) {
          botLogger.warn({ err }, "[prefix:weather] fetch failed");
          return message.reply("❌ Couldn't fetch weather for that location.");
        }
      } catch (err) {
        botLogger.error({ err }, "[prefix:weather] execute error");
        await message.reply("❌ Couldn't fetch weather for that location.");
      }
    },
  },
];
