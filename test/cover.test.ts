import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { isGameCover, isSafeCoverKey } from "../src/domain/cover";
import { validateGameDraft } from "../src/domain/validation";
import { CoverSearchCache } from "../src/main/cover-search-cache";
import { parseTheGamesDbResults } from "../src/main/thegamesdb-parser";

const validCover = {
  provider: "howlongtobeat" as const,
  key: "cover-1234abcd.jpg",
  title: "Dark Souls: Remastered",
  sourceId: "1234",
  sourceUrl: "https://howlongtobeat.com/game/1234",
};

test("validates local cover metadata without accepting unsafe paths", () => {
  assert.equal(isGameCover(validCover), true);
  assert.equal(isSafeCoverKey(validCover.key), true);
  assert.equal(isSafeCoverKey("../library.json"), false);
  assert.equal(
    isGameCover({ ...validCover, key: "cover-1234abcd.svg" }),
    false,
  );
});

test("keeps a selected cover in a validated manual draft", () => {
  const validated = validateGameDraft({
    name: "Dark Souls: Remastered",
    date: "2026-08-04",
    score: null,
    recommendation: "Recomendado",
    cover: validCover,
    notes: "",
    year: 2026,
    ratingMode: "semicolon-recommendation",
  });

  assert.deepEqual(validated.cover, validCover);
});

test("parses TheGamesDB front box art into cover candidates", () => {
  const results = parseTheGamesDbResults({
    data: {
      games: [{ id: 570940, game_title: "DARK SOULS: REMASTERED" }],
    },
    include: {
      boxart: {
        base_url: { large: "https://cdn.thegamesdb.net/images/large/" },
        data: {
          "570940": [
            {
              type: "boxart",
              side: "front",
              filename: "boxart/front/570940-1.jpg",
            },
          ],
        },
      },
    },
  });

  assert.deepEqual(results, [
    {
      provider: "thegamesdb",
      sourceId: "570940",
      title: "DARK SOULS: REMASTERED",
      imageUrl:
        "https://cdn.thegamesdb.net/images/large/boxart/front/570940-1.jpg",
      detailUrl: "https://thegamesdb.net/game.php?id=570940",
    },
  ]);
});

test("persists normalized cover searches and clears them without touching selected covers", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-cover-cache-"));
  const cachePath = join(directory, "cover-search-cache.v1.json");
  const cache = new CoverSearchCache(cachePath);
  const candidate = {
    provider: "thegamesdb" as const,
    sourceId: "570940",
    title: "DARK SOULS: REMASTERED",
    imageUrl: "https://cdn.thegamesdb.net/images/large/boxart/front/570940-1.jpg",
    detailUrl: "https://thegamesdb.net/game.php?id=570940",
  };

  try {
    assert.equal(await cache.get("Dark Souls: Remastered", "thegamesdb"), undefined);
    await cache.set("Dark Souls: Remastered", "thegamesdb", [candidate]);
    assert.deepEqual(
      await cache.get("  dark   souls: remastered ", "thegamesdb"),
      [candidate],
    );
    assert.equal(await cache.get("Dark Souls: Remastered", "hltb"), undefined);

    await cache.set("unknown title", "thegamesdb", []);
    assert.deepEqual(await cache.get("unknown title", "thegamesdb"), []);
    assert.equal(JSON.parse(await readFile(cachePath, "utf8")).schemaVersion, 1);

    await cache.clear();
    assert.equal(
      await cache.get("Dark Souls: Remastered", "thegamesdb"),
      undefined,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
