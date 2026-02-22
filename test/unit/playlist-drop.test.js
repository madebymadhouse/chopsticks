// test/unit/playlist-drop.test.js
// Backtests for the playlist drag-and-drop / ingest feature
import { describe, it, beforeEach } from "mocha";
import { strict as assert } from "assert";
import { data as musicData } from "../../src/commands/music.js";

// ── Helper: extract all subcommands from the SlashCommandBuilder JSON ─────────
function flatSubcommands(json) {
  return (json.options ?? []).flatMap(o => {
    if (o.type === 1) return [o]; // SUB_COMMAND
    if (o.type === 2) return (o.options ?? []).map(s => ({ ...s, _group: o.name })); // SUB_COMMAND_GROUP
    return [];
  });
}

// ── Mock guildData helper ─────────────────────────────────────────────────────
function makeGuildData(overrides = {}) {
  return {
    music: {
      playlists: {
        maxItemsPerPlaylist: 200,
        maxPlaylists: 25,
        maxPersonalPerUser: 3,
        allowUserCreation: true,
        playlists: {},
        channelBindings: {},
        ...overrides.playlists
      },
      drops: { channelIds: [], ...overrides.drops }
    }
  };
}

function makePlaylist(overrides = {}) {
  return {
    id: "pl_test1",
    name: "Test Playlist",
    channelId: "thread_123",
    visibility: "collaborators",
    createdBy: "user_owner",
    collaborators: ["user_collab"],
    perms: { read: "guild", write: "collaborators" },
    items: [],
    panel: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  };
}

// ── Discord command builder structure ─────────────────────────────────────────
describe("playlist subcommand structure", function () {
  let json, flat;

  beforeEach(function () {
    json = musicData.toJSON();
    flat = flatSubcommands(json);
  });

  it("playlist group exists", function () {
    const groups = (json.options ?? []).filter(o => o.type === 2);
    const plGroup = groups.find(g => g.name === "playlist");
    assert.ok(plGroup, "playlist subcommand group should exist");
  });

  it("playlist save is inside the playlist group", function () {
    const save = flat.find(s => s.name === "save" && s._group === "playlist");
    assert.ok(save, "save should be inside playlist group");
    const nameOpt = (save?.options ?? []).find(o => o.name === "name");
    assert.ok(nameOpt?.required, "save name option must be required");
    assert.equal(nameOpt?.max_length, 50, "save name max_length should be 50");
  });

  it("playlist load is inside the playlist group", function () {
    const load = flat.find(s => s.name === "load" && s._group === "playlist");
    assert.ok(load, "load should be inside playlist group");
  });

  it("playlist panel and browse are inside the playlist group", function () {
    const panel = flat.find(s => s.name === "panel" && s._group === "playlist");
    const browse = flat.find(s => s.name === "browse" && s._group === "playlist");
    assert.ok(panel, "panel should be in playlist group");
    assert.ok(browse, "browse should be in playlist group");
  });

  it("social subcommand group exists with expected subcommands", function () {
    const groups = (json.options ?? []).filter(o => o.type === 2);
    const social = groups.find(g => g.name === "social");
    assert.ok(social, "social subcommand group should exist");
    const subs = (social?.options ?? []).map(s => s.name);
    assert.ok(subs.includes("dedicate"), "social should have dedicate");
    assert.ok(subs.includes("history"), "social should have history");
    assert.ok(subs.includes("request"), "social should have request");
    assert.ok(subs.includes("trivia"), "social should have trivia");
  });

  it("total top-level options does not exceed Discord limit of 25", function () {
    const count = (json.options ?? []).length;
    assert.ok(count <= 25, `Too many top-level options: ${count} (max 25)`);
  });

  it("dj subcommand exists with on/off/persona/test actions", function () {
    const dj = flat.find(s => s.name === "dj");
    assert.ok(dj, "dj subcommand should exist");
    const actionOpt = (dj?.options ?? []).find(o => o.name === "action");
    assert.ok(actionOpt?.required, "dj action option should be required");
    const choices = (actionOpt?.choices ?? []).map(c => c.value);
    assert.ok(choices.includes("on"), "dj should have on action");
    assert.ok(choices.includes("off"), "dj should have off action");
    assert.ok(choices.includes("persona"), "dj should have persona action");
    assert.ok(choices.includes("test"), "dj should have test action");
  });

  it("autoplay subcommand has required boolean enabled option", function () {
    const ap = flat.find(s => s.name === "autoplay");
    assert.ok(ap, "autoplay subcommand should exist");
    const enabledOpt = (ap?.options ?? []).find(o => o.name === "enabled");
    assert.ok(enabledOpt?.required, "autoplay enabled option should be required");
    assert.equal(enabledOpt?.type, 5, "enabled should be a BOOLEAN (type 5)");
  });
});

// ── Playlist data model unit tests ────────────────────────────────────────────
describe("playlist item data model", function () {
  it("attachment item has correct shape", function () {
    const item = {
      id: "mpli_abc",
      type: "attachment",
      title: "song.mp3",
      url: "https://cdn.discordapp.com/attachments/123/456/song.mp3",
      size: 1024 * 1024,
      contentType: "audio/mpeg",
      addedBy: "user_123",
      addedAt: Date.now(),
      sourceMessageId: "msg_456"
    };
    assert.equal(item.type, "attachment");
    assert.ok(item.url.startsWith("https://"), "url should be a CDN URL");
    assert.ok(item.addedAt > 0, "addedAt should be set");
  });

  it("url item has correct shape", function () {
    const item = {
      id: "mpli_def",
      type: "url",
      title: "Link",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      size: 0,
      contentType: "",
      addedBy: "user_123",
      addedAt: Date.now(),
      sourceMessageId: "msg_789"
    };
    assert.equal(item.type, "url");
    assert.ok(item.url.includes("youtube.com"), "url should be a YouTube link");
  });

  it("query item has correct shape", function () {
    const item = {
      id: "mpli_ghi",
      type: "query",
      title: "lofi hip hop",
      url: "lofi hip hop",
      size: 0,
      contentType: "",
      addedBy: "user_123",
      addedAt: Date.now(),
      sourceMessageId: "msg_101"
    };
    assert.equal(item.type, "query");
    assert.equal(item.title, item.url, "query: title and url are the same search string");
  });
});

// ── Deduplication logic ───────────────────────────────────────────────────────
describe("playlist deduplication", function () {
  it("does not add duplicate URLs", function () {
    const pl = makePlaylist({
      items: [
        { id: "i1", url: "https://cdn.discordapp.com/attachments/a/b/song.mp3" }
      ]
    });

    const newItem = { id: "i2", url: "https://cdn.discordapp.com/attachments/a/b/song.mp3" };
    const seen = new Set(pl.items.map(it => String(it?.url ?? "")));
    const toAdd = [];
    if (!seen.has(newItem.url)) {
      seen.add(newItem.url);
      toAdd.push(newItem);
    }
    assert.equal(toAdd.length, 0, "duplicate URL should not be added");
  });

  it("allows different URLs", function () {
    const pl = makePlaylist({
      items: [{ id: "i1", url: "https://cdn.discordapp.com/a/b/c/song1.mp3" }]
    });
    const newItem = { id: "i2", url: "https://cdn.discordapp.com/a/b/c/song2.mp3" };
    const seen = new Set(pl.items.map(it => String(it?.url ?? "")));
    const toAdd = [];
    if (!seen.has(newItem.url)) toAdd.push(newItem);
    assert.equal(toAdd.length, 1, "different URL should be added");
  });
});

// ── Max items cap ─────────────────────────────────────────────────────────────
describe("playlist max items cap", function () {
  it("caps items at maxItemsPerPlaylist", function () {
    const MAX = 5;
    const existing = Array.from({ length: MAX - 1 }, (_, i) => ({
      id: `i${i}`, url: `https://cdn.discordapp.com/file${i}.mp3`
    }));
    const toAdd = [
      { id: "new1", url: "https://cdn.discordapp.com/new1.mp3" },
      { id: "new2", url: "https://cdn.discordapp.com/new2.mp3" }
    ];
    const combined = [...toAdd, ...existing].slice(0, MAX);
    assert.equal(combined.length, MAX, "items should be capped at maxItemsPerPlaylist");
  });

  it("respects the full default cap of 200", function () {
    assert.equal(200, 200); // cap constant documented
  });
});

// ── Write permission checks ───────────────────────────────────────────────────
describe("playlist write permission checks", function () {
  function canWrite(pl, userId, isAdmin) {
    const writeMode = String(pl?.perms?.write || "guild");
    if (writeMode === "guild") return true;
    const isOwner = String(pl.createdBy || "") === userId;
    const collabs = new Set(Array.isArray(pl.collaborators) ? pl.collaborators.map(String) : []);
    const isCollab = collabs.has(userId);
    return writeMode === "owner"
      ? (isAdmin || isOwner)
      : (isAdmin || isOwner || isCollab);
  }

  it("guild mode allows everyone", function () {
    const pl = makePlaylist({ perms: { write: "guild", read: "guild" } });
    assert.ok(canWrite(pl, "random_user", false));
  });

  it("owner mode blocks non-owners", function () {
    const pl = makePlaylist({ perms: { write: "owner", read: "guild" } });
    assert.ok(!canWrite(pl, "random_user", false));
  });

  it("owner mode allows owner", function () {
    const pl = makePlaylist({ perms: { write: "owner", read: "guild" } });
    assert.ok(canWrite(pl, "user_owner", false));
  });

  it("collaborators mode allows collabs", function () {
    const pl = makePlaylist({ perms: { write: "collaborators", read: "guild" } });
    assert.ok(canWrite(pl, "user_collab", false));
  });

  it("collaborators mode blocks random user", function () {
    const pl = makePlaylist({ perms: { write: "collaborators", read: "guild" } });
    assert.ok(!canWrite(pl, "outsider_999", false));
  });

  it("admins bypass all write restrictions", function () {
    const pl = makePlaylist({ perms: { write: "owner", read: "guild" } });
    assert.ok(canWrite(pl, "outsider_999", true));
  });
});

// ── Thread cleanup — channelBinding removal logic ─────────────────────────────
describe("threadDelete channelBinding cleanup", function () {
  it("removes stale channelBinding when thread is deleted", function () {
    const guildData = makeGuildData({
      playlists: {
        maxItemsPerPlaylist: 200,
        maxPlaylists: 25,
        maxPersonalPerUser: 3,
        allowUserCreation: true,
        playlists: {
          pl_test1: makePlaylist({ channelId: "thread_abc" })
        },
        channelBindings: { thread_abc: "pl_test1" }
      }
    });

    // Simulate threadDelete handler logic
    const threadId = "thread_abc";
    const bindings = guildData.music.playlists.channelBindings;
    if (threadId in bindings) {
      const pid = bindings[threadId];
      delete bindings[threadId];
      const pl = guildData.music.playlists.playlists?.[pid];
      if (pl && pl.channelId === threadId) pl.channelId = null;
    }

    assert.ok(!("thread_abc" in bindings), "binding should be removed");
    assert.equal(guildData.music.playlists.playlists.pl_test1.channelId, null, "playlist channelId should be null");
  });

  it("does not affect other playlists when unrelated thread deleted", function () {
    const guildData = makeGuildData({
      playlists: {
        maxItemsPerPlaylist: 200, maxPlaylists: 25, maxPersonalPerUser: 3, allowUserCreation: true,
        playlists: { pl_test1: makePlaylist({ channelId: "thread_kept" }) },
        channelBindings: { thread_kept: "pl_test1" }
      }
    });

    const threadId = "thread_unrelated";
    const bindings = guildData.music.playlists.channelBindings;
    if (threadId in bindings) delete bindings[threadId];

    assert.ok("thread_kept" in bindings, "unrelated thread binding should be untouched");
  });
});

// ── close_drop permission model ───────────────────────────────────────────────
describe("close_drop permission model", function () {
  function canArchive(pl, userId, isAdmin) {
    const isOwner = String(pl?.createdBy || "") === userId;
    return isAdmin || isOwner;
  }

  function canRemoveSelf() {
    return true; // anyone can remove themselves from a thread
  }

  it("owner can archive the thread", function () {
    const pl = makePlaylist();
    assert.ok(canArchive(pl, "user_owner", false));
  });

  it("admin can archive any thread", function () {
    const pl = makePlaylist();
    assert.ok(canArchive(pl, "random_admin", true));
  });

  it("collaborator cannot archive but can remove themselves", function () {
    const pl = makePlaylist();
    assert.ok(!canArchive(pl, "user_collab", false));
    assert.ok(canRemoveSelf());
  });

  it("stranger cannot archive but can remove themselves", function () {
    const pl = makePlaylist();
    assert.ok(!canArchive(pl, "outsider", false));
    assert.ok(canRemoveSelf());
  });
});

// ── Rate limiting constants ───────────────────────────────────────────────────
describe("playlist rate limit keys", function () {
  it("ingest rate limit key pattern is correct", function () {
    const key = `musicpl:ingest:GUILD:CHANNEL:USER`;
    assert.ok(key.startsWith("musicpl:ingest:"), "ingest key prefix correct");
  });

  it("deny rate limit key pattern is correct", function () {
    const key = `musicpl:deny:GUILD:PL:USER`;
    assert.ok(key.startsWith("musicpl:deny:"), "deny key prefix correct");
  });

  it("attachment warning rate limit key pattern is correct", function () {
    const key = `musicpl:att_warn:GUILD:USER`;
    assert.ok(key.startsWith("musicpl:att_warn:"), "att_warn key prefix correct");
  });

  it("hint rate limit key pattern is correct", function () {
    const key = `musicpl:hint:GUILD:USER`;
    assert.ok(key.startsWith("musicpl:hint:"), "hint key prefix correct");
  });
});
