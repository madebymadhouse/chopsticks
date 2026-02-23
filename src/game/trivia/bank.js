// src/game/trivia/bank.js
import { TRIVIA_QUESTIONS } from "./questions.js";
import { fetchOtdbQuestion, OTDB_CATEGORIES } from "./opentdb.js";

export const TRIVIA_DIFFICULTIES = ["easy", "normal", "hard", "nightmare"];
export const TRIVIA_CATEGORIES = ["General", "Tech", "Music", "Games", "Science", "Movies", "Arcana"];

// All categories (local + OTDB extras)
const ALL_CATEGORIES = [...new Set([...TRIVIA_CATEGORIES, ...OTDB_CATEGORIES])];

function normDifficulty(v) {
  const s = String(v || "").toLowerCase();
  if (TRIVIA_DIFFICULTIES.includes(s)) return s;
  return "normal";
}

function normCategory(v) {
  const s = String(v || "").trim();
  if (!s || s.toLowerCase() === "any") return "Any";
  const hit = TRIVIA_CATEGORIES.find(c => c.toLowerCase() === s.toLowerCase());
  return hit || "Any";
}

export function listTriviaCategories() {
  return ["Any", ...ALL_CATEGORIES];
}

export function pickTriviaQuestion({ difficulty = "normal", category = "Any", excludeIds = [] } = {}) {
  const d = normDifficulty(difficulty);
  const c = normCategory(category);
  const excluded = new Set((excludeIds || []).map(String));

  const pool = TRIVIA_QUESTIONS.filter(q => {
    if (!q?.id || excluded.has(String(q.id))) return false;
    if (q.difficulty !== d) return false;
    if (c !== "Any" && q.category !== c) return false;
    return Array.isArray(q.choices) && q.choices.length >= 2;
  });

  // Fallback: relax category first, then relax difficulty.
  let candidates = pool;
  if (candidates.length === 0) {
    candidates = TRIVIA_QUESTIONS.filter(q => q?.id && !excluded.has(String(q.id)) && q.difficulty === d);
  }
  if (candidates.length === 0) {
    candidates = TRIVIA_QUESTIONS.filter(q => q?.id && !excluded.has(String(q.id)));
  }
  if (candidates.length === 0) return null;

  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx] || null;
}

/**
 * Pick a trivia question, falling back to Open Trivia DB when the local bank
 * has no matching questions (e.g. extended categories like History, Geography).
 */
export async function pickTriviaQuestionWithFallback(opts = {}) {
  const local = pickTriviaQuestion(opts);
  if (local) return local;
  // Live fallback — returns null if OTDB is unreachable (graceful degradation)
  return fetchOtdbQuestion(opts);
}

