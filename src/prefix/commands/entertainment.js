// src/prefix/commands/entertainment.js
// Cycle P7 — Pop Culture & Entertainment Pack (all free/no-key APIs)

import { EmbedBuilder, Colors } from "discord.js";
import { httpFetch } from "../../utils/httpFetch.js";

const USER_AGENT = "Chopsticks-Discord-Bot/2.0";

async function fetchJson(service, url) {
  const res = await httpFetch(service, url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default [
  {
    name: "pokemon",
    aliases: ["poke", "dex"],
    description: "Pokémon info — !pokemon <name|id>",
    rateLimit: 4000,
    async execute(message, args) {
      const query = args[0]?.toLowerCase().trim();
      if (!query) return message.reply("Usage: `!pokemon <name or id>` — e.g. `!pokemon pikachu`");
      try {
        const d = await fetchJson("pokeapi", `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(query)}`);
        const types = d.types.map(t => t.type.name).join(", ");
        const hp = d.stats.find(s => s.stat.name === "hp")?.base_stat || "?";
        const atk = d.stats.find(s => s.stat.name === "attack")?.base_stat || "?";
        const def = d.stats.find(s => s.stat.name === "defense")?.base_stat || "?";
        const spd = d.stats.find(s => s.stat.name === "speed")?.base_stat || "?";
        const embed = new EmbedBuilder()
          .setTitle(`#${d.id} — ${d.name.charAt(0).toUpperCase() + d.name.slice(1)}`)
          .setThumbnail(d.sprites.front_default)
          .setColor(0xFF73FA)
          .addFields(
            { name: "Type", value: types, inline: true },
            { name: "Height", value: `${d.height / 10}m`, inline: true },
            { name: "Weight", value: `${d.weight / 10}kg`, inline: true },
            { name: "HP", value: String(hp), inline: true },
            { name: "ATK", value: String(atk), inline: true },
            { name: "DEF / SPD", value: `${def} / ${spd}`, inline: true },
          )
          .setFooter({ text: "PokéAPI • Chopsticks !pokemon" });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply(`❌ Pokémon \`${query}\` not found. Check spelling or use the Pokédex ID.`);
      }
    }
  },

  {
    name: "rickmorty",
    aliases: ["rick", "rm"],
    description: "Rick & Morty character — !rickmorty <name>",
    rateLimit: 4000,
    async execute(message, args) {
      const query = args.join(" ").trim();
      if (!query) return message.reply("Usage: `!rickmorty <character name>` — e.g. `!rickmorty Rick`");
      try {
        const d = await fetchJson("rickmortyapi", `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(query)}`);
        const char = d.results?.[0];
        if (!char) return message.reply(`❌ No character found for \`${query}\`.`);
        const embed = new EmbedBuilder()
          .setTitle(char.name)
          .setThumbnail(char.image)
          .setColor(0x57F287)
          .addFields(
            { name: "Status", value: char.status, inline: true },
            { name: "Species", value: char.species, inline: true },
            { name: "Gender", value: char.gender, inline: true },
            { name: "Origin", value: char.origin?.name || "Unknown", inline: true },
            { name: "Location", value: char.location?.name || "Unknown", inline: true },
          )
          .setFooter({ text: `rickandmortyapi.com • Chopsticks !rickmorty` });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Couldn't fetch character info right now.");
      }
    }
  },

  {
    name: "show",
    aliases: ["tvshow", "tv"],
    description: "TV show info — !show <title>",
    rateLimit: 4000,
    async execute(message, args) {
      const query = args.join(" ").trim();
      if (!query) return message.reply("Usage: `!show <title>` — e.g. `!show Breaking Bad`");
      try {
        const results = await fetchJson("tvmaze", `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`);
        const show = results?.[0]?.show;
        if (!show) return message.reply(`❌ No show found for \`${query}\`.`);
        const embed = new EmbedBuilder()
          .setTitle(show.name)
          .setColor(0x5865F2)
          .setDescription(show.summary?.replace(/<[^>]+>/g, "").slice(0, 300) || "No summary available.")
          .addFields(
            { name: "Network", value: show.network?.name || show.webChannel?.name || "Unknown", inline: true },
            { name: "Status", value: show.status || "Unknown", inline: true },
            { name: "Rating", value: show.rating?.average ? `⭐ ${show.rating.average}/10` : "N/A", inline: true },
            { name: "Genres", value: show.genres?.join(", ") || "N/A", inline: true },
            { name: "Premiered", value: show.premiered || "Unknown", inline: true },
          );
        if (show.image?.medium) embed.setThumbnail(show.image.medium);
        embed.setFooter({ text: `tvmaze.com • Chopsticks !show` });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Couldn't fetch show info right now.");
      }
    }
  },

  {
    name: "cocktail",
    aliases: ["drink", "mixology"],
    description: "Random cocktail recipe — !cocktail [name]",
    rateLimit: 4000,
    async execute(message, args) {
      const query = args.join(" ").trim();
      const url = query
        ? `https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
        : `https://www.thecocktaildb.com/api/json/v1/1/random.php`;
      try {
        const d = await fetchJson("cocktaildb", url);
        const drink = d.drinks?.[0];
        if (!drink) return message.reply(`❌ No cocktail found for \`${query}\`.`);
        const ingredients = [];
        for (let i = 1; i <= 15; i++) {
          const ing = drink[`strIngredient${i}`];
          const measure = drink[`strMeasure${i}`];
          if (ing) ingredients.push(`${measure?.trim() || ""} ${ing}`.trim());
        }
        const embed = new EmbedBuilder()
          .setTitle(`🍹 ${drink.strDrink}`)
          .setColor(0xF0B232)
          .addFields(
            { name: "Category", value: drink.strCategory || "N/A", inline: true },
            { name: "Glass", value: drink.strGlass || "N/A", inline: true },
            { name: "Alcoholic", value: drink.strAlcoholic || "N/A", inline: true },
            { name: "Ingredients", value: ingredients.join("\n") || "N/A" },
            { name: "Instructions", value: drink.strInstructions?.slice(0, 500) || "N/A" },
          );
        if (drink.strDrinkThumb) embed.setThumbnail(drink.strDrinkThumb);
        embed.setFooter({ text: "thecocktaildb.com • Chopsticks !cocktail" });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Couldn't fetch cocktail recipe right now.");
      }
    }
  },

  {
    name: "meal",
    aliases: ["recipe", "food"],
    description: "Random meal recipe — !meal [name]",
    rateLimit: 4000,
    async execute(message, args) {
      const query = args.join(" ").trim();
      const url = query
        ? `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`
        : `https://www.themealdb.com/api/json/v1/1/random.php`;
      try {
        const d = await fetchJson("mealdb", url);
        const meal = d.meals?.[0];
        if (!meal) return message.reply(`❌ No meal found for \`${query || "random"}\`.`);
        const embed = new EmbedBuilder()
          .setTitle(`🍽️ ${meal.strMeal}`)
          .setColor(0xED4245)
          .addFields(
            { name: "Category", value: meal.strCategory || "N/A", inline: true },
            { name: "Area", value: meal.strArea || "N/A", inline: true },
            { name: "Instructions", value: meal.strInstructions?.slice(0, 600) || "N/A" },
          );
        if (meal.strMealThumb) embed.setThumbnail(meal.strMealThumb);
        if (meal.strYoutube) embed.setURL(meal.strYoutube);
        embed.setFooter({ text: "themealdb.com • Chopsticks !meal" });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Couldn't fetch meal recipe right now.");
      }
    }
  },

  {
    name: "kanye",
    aliases: ["kanyewest", "ye"],
    description: "Random Kanye West quote — !kanye",
    rateLimit: 3000,
    async execute(message) {
      try {
        const d = await fetchJson("kanyeRest", "https://api.kanye.rest/");
        const embed = new EmbedBuilder()
          .setTitle("🎤 Kanye Says...")
          .setDescription(`*"${d.quote}"*`)
          .setColor(0xF0B232)
          .setFooter({ text: "— Kanye West • Chopsticks !kanye" });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Kanye isn't speaking right now. Try again!");
      }
    }
  },

  {
    name: "chuck",
    aliases: ["chucknorris", "norris"],
    description: "Random Chuck Norris fact — !chuck",
    rateLimit: 3000,
    async execute(message) {
      try {
        const d = await fetchJson("chuckNorris", "https://api.chucknorris.io/jokes/random");
        const embed = new EmbedBuilder()
          .setTitle("💪 Chuck Norris Fact")
          .setDescription(d.value)
          .setColor(0xED4245)
          .setFooter({ text: "chucknorris.io • Chopsticks !chuck" });
        await message.reply({ embeds: [embed] });
      } catch {
        await message.reply("❌ Chuck Norris is too powerful to fetch right now.");
      }
    }
  },

  {
    name: "bored",
    aliases: ["activity", "whatdo"],
    description: "Random activity suggestion — !bored",
    rateLimit: 3000,
    async execute(message) {
      // boredapi.com shut down — use local bank
      const ACTIVITIES = [
        "🎨 Draw something from memory", "🎵 Learn a new song on an instrument",
        "📚 Read the first 10 pages of a random book", "🧘 Do a 5-minute meditation",
        "✍️ Write a short story in under 200 words", "🍳 Cook a meal you've never made before",
        "🎮 Speed-run a game you know well", "🌱 Plant something and keep a growth log",
        "🔭 Look up a constellation and learn 3 facts about it", "🧩 Solve a 5-minute puzzle",
        "📝 Write 3 things you're grateful for", "🎲 Play a game with someone nearby",
        "💌 Write a letter to your future self", "🏃 Go for a 10-minute walk outside",
        "🎤 Freestyle rap for 60 seconds straight",
      ];
      const activity = ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
      const embed = new EmbedBuilder()
        .setTitle("🎯 Not Bored Anymore")
        .setDescription(`How about: **${activity}**?`)
        .setColor(0x5865F2)
        .setFooter({ text: "Chopsticks !bored" });
      await message.reply({ embeds: [embed] });
    }
  },
];
