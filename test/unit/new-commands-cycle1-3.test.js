import { describe, it } from "mocha";
import { strict as assert } from "assert";

// ── Ping ─────────────────────────────────────────────────────────────────────
import { data as pingData, execute as pingExecute } from "../../src/commands/ping.js";
describe("ping command", function () {
  it("is named 'ping'", function () {
    assert.equal(pingData.toJSON().name, "ping");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof pingExecute, "function");
  });
});

// ── Botinfo ───────────────────────────────────────────────────────────────────
import { data as botinfoData, execute as botinfoExecute } from "../../src/commands/botinfo.js";
describe("botinfo command", function () {
  it("is named 'botinfo'", function () {
    assert.equal(botinfoData.toJSON().name, "botinfo");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof botinfoExecute, "function");
  });
});

// ── Weather ───────────────────────────────────────────────────────────────────
import { data as weatherData, execute as weatherExecute } from "../../src/commands/weather.js";
describe("weather command", function () {
  it("is named 'weather'", function () {
    assert.equal(weatherData.toJSON().name, "weather");
  });
  it("requires a 'location' option", function () {
    const opts = weatherData.toJSON().options ?? [];
    const loc = opts.find(o => o.name === "location");
    assert.ok(loc, "location option missing");
    assert.ok(loc.required, "location should be required");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof weatherExecute, "function");
  });
});

// ── Fact ─────────────────────────────────────────────────────────────────────
import { data as factData, execute as factExecute } from "../../src/commands/fact.js";
describe("fact command", function () {
  it("is named 'fact'", function () {
    assert.equal(factData.toJSON().name, "fact");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof factExecute, "function");
  });
});

// ── Wiki ─────────────────────────────────────────────────────────────────────
import { data as wikiData, execute as wikiExecute } from "../../src/commands/wiki.js";
describe("wiki command", function () {
  it("is named 'wiki'", function () {
    assert.equal(wikiData.toJSON().name, "wiki");
  });
  it("requires a 'query' option", function () {
    const opts = wikiData.toJSON().options ?? [];
    const q = opts.find(o => o.name === "query");
    assert.ok(q, "query option missing");
    assert.ok(q.required);
  });
  it("exports execute as a function", function () {
    assert.equal(typeof wikiExecute, "function");
  });
});

// ── Joke ─────────────────────────────────────────────────────────────────────
import { data as jokeData, execute as jokeExecute } from "../../src/commands/joke.js";
describe("joke command", function () {
  it("is named 'joke'", function () {
    assert.equal(jokeData.toJSON().name, "joke");
  });
  it("has optional category option", function () {
    const opts = jokeData.toJSON().options ?? [];
    const cat = opts.find(o => o.name === "category");
    assert.ok(cat, "category option missing");
    assert.ok(!cat.required, "category should be optional");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof jokeExecute, "function");
  });
});

// ── APOD ─────────────────────────────────────────────────────────────────────
import { data as apodData, execute as apodExecute } from "../../src/commands/apod.js";
describe("apod command", function () {
  it("is named 'apod'", function () {
    assert.equal(apodData.toJSON().name, "apod");
  });
  it("has optional date option", function () {
    const opts = apodData.toJSON().options ?? [];
    const date = opts.find(o => o.name === "date");
    assert.ok(date, "date option missing");
    assert.ok(!date.required, "date should be optional");
  });
  it("exports execute as a function", function () {
    assert.equal(typeof apodExecute, "function");
  });
});

// ── Urban Dictionary ──────────────────────────────────────────────────────────
import { data as urbanData, execute as urbanExecute } from "../../src/commands/urban.js";
describe("urban command", function () {
  it("is named 'urban'", function () {
    assert.equal(urbanData.toJSON().name, "urban");
  });
  it("requires a 'term' option", function () {
    const opts = urbanData.toJSON().options ?? [];
    const t = opts.find(o => o.name === "term");
    assert.ok(t, "term option missing");
    assert.ok(t.required);
  });
  it("exports execute as a function", function () {
    assert.equal(typeof urbanExecute, "function");
  });
});

// ── Book ─────────────────────────────────────────────────────────────────────
import { data as bookData, execute as bookExecute } from "../../src/commands/book.js";
describe("book command", function () {
  it("is named 'book'", function () {
    assert.equal(bookData.toJSON().name, "book");
  });
  it("requires a 'query' option", function () {
    const opts = bookData.toJSON().options ?? [];
    const q = opts.find(o => o.name === "query");
    assert.ok(q, "query option missing");
    assert.ok(q.required);
  });
  it("exports execute as a function", function () {
    assert.equal(typeof bookExecute, "function");
  });
});

// ── GitHub ────────────────────────────────────────────────────────────────────
import { data as githubData, execute as githubExecute } from "../../src/commands/github.js";
describe("github command", function () {
  it("is named 'github'", function () {
    assert.equal(githubData.toJSON().name, "github");
  });
  it("requires a 'query' option", function () {
    const opts = githubData.toJSON().options ?? [];
    const q = opts.find(o => o.name === "query");
    assert.ok(q, "query option missing");
    assert.ok(q.required);
  });
  it("exports execute as a function", function () {
    assert.equal(typeof githubExecute, "function");
  });
});

// ── Anime ─────────────────────────────────────────────────────────────────────
import { data as animeData, execute as animeExecute } from "../../src/commands/anime.js";
describe("anime command", function () {
  it("is named 'anime'", function () {
    assert.equal(animeData.toJSON().name, "anime");
  });
  it("requires a 'title' option", function () {
    const opts = animeData.toJSON().options ?? [];
    const t = opts.find(o => o.name === "title");
    assert.ok(t, "title option missing");
    assert.ok(t.required);
  });
  it("exports execute as a function", function () {
    assert.equal(typeof animeExecute, "function");
  });
});

// ── Open-Meteo utility ────────────────────────────────────────────────────────
import { wmoLabel } from "../../src/utils/openmeteo.js";
describe("openmeteo wmoLabel", function () {
  it("returns emoji+label tuple for known code 0", function () {
    const [emoji, label] = wmoLabel(0);
    assert.equal(emoji, "☀️");
    assert.ok(label.length > 0);
  });
  it("returns a fallback tuple for unknown code 999", function () {
    const [emoji, label] = wmoLabel(999);
    assert.ok(typeof emoji === "string");
    assert.ok(typeof label === "string");
  });
});

// ── OTDB helper ───────────────────────────────────────────────────────────────
import { pickTriviaQuestion, pickTriviaQuestionWithFallback } from "../../src/game/trivia/bank.js";
describe("trivia bank with OTDB fallback", function () {
  it("pickTriviaQuestion returns an object or null", function () {
    const q = pickTriviaQuestion({ difficulty: "easy" });
    assert.ok(q === null || (typeof q === "object" && q.prompt));
  });
  it("pickTriviaQuestionWithFallback returns a promise", function () {
    const p = pickTriviaQuestionWithFallback({ difficulty: "easy" });
    assert.ok(p && typeof p.then === "function");
    return p.then(q => assert.ok(q === null || (typeof q === "object" && (q.prompt || q.question))));
  });
});
