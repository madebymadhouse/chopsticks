/**
 * Open Trivia Database (opentdb.com) live question fetcher.
 * Free API, no key required.
 * Used as a live fallback when the local bank has no matching questions.
 */
import { request } from "undici";
import { botLogger } from "../../utils/modernLogger.js";

const BASE = "https://opentdb.com/api.php";

// Map local category names to OTDB category IDs
const CATEGORY_MAP = {
  "General": 9,
  "Tech": 18,       // Science: Computers
  "Music": 12,      // Entertainment: Music
  "Games": 15,      // Entertainment: Video Games
  "Science": 17,    // Science & Nature
  "Movies": 11,     // Entertainment: Film
  "History": 23,
  "Geography": 22,
  "Sports": 21,
  "Mythology": 20,
  "Vehicles": 28,
  "Celebrities": 26,
  "Animals": 27,
  "Art": 25,
};

const DIFFICULTY_MAP = {
  easy: "easy",
  normal: "medium",
  hard: "hard",
  nightmare: "hard",
};

function decodeHtml(str) {
  return String(str)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D");
}

/**
 * Fetch one question from OpenTDB.
 * @param {{ difficulty?: string, category?: string }} opts
 * @returns {Promise<{id:string, question:string, answer:string, choices:string[], difficulty:string, category:string}|null>}
 */
export async function fetchOtdbQuestion({ difficulty = "normal", category = "Any" } = {}) {
  const params = new URLSearchParams({ amount: "1", type: "multiple" });

  const diff = DIFFICULTY_MAP[difficulty] || "medium";
  params.set("difficulty", diff);

  const catId = CATEGORY_MAP[category];
  if (catId) params.set("category", String(catId));

  try {
    const { statusCode, body } = await request(`${BASE}?${params}`, {
      headers: { "User-Agent": "Chopsticks-Discord-Bot/1.0" }
    });
    if (statusCode !== 200) return null;

    const data = await body.json();
    if (data.response_code !== 0 || !data.results?.length) return null;

    const r = data.results[0];
    const answer = decodeHtml(r.correct_answer);
    const wrongs = r.incorrect_answers.map(decodeHtml);
    const choices = [...wrongs, answer].sort(() => Math.random() - 0.5);

    return {
      id: `otdb_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      question: decodeHtml(r.question),
      answer,
      choices,
      difficulty,
      category: r.category,
      source: "otdb"
    };
  } catch (err) {
    botLogger.warn({ err }, "[opentdb] fetch failed, using local bank");
    return null;
  }
}

export const OTDB_CATEGORIES = Object.keys(CATEGORY_MAP);
