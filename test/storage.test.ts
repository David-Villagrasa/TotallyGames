import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { parseTextFile } from "../src/domain/importer";
import { RAW_PLATFORM_EXTRA_KEY } from "../src/domain/platform";
import { createImportRowKey } from "../src/domain/review";
import { JsonGameRepository } from "../src/domain/storage";

test("commits parsed games to a versioned store and skips duplicates by default", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-store-"));
  const storePath = join(directory, "library.v1.json");
  const repository = new JsonGameRepository(storePath);
  const parsed = parseTextFile(
    "2022 games.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nFactorio;08/01/22;8;-",
  );
  const batch = {
    id: "batch-1",
    createdAt: new Date().toISOString(),
    files: [parsed],
  };

  try {
    const first = await repository.commitImport(batch, false);
    assert.equal(first.imported, 1);
    assert.equal(first.skippedDuplicates, 0);
    assert.equal(first.coverImport.enabled, false);

    const second = await repository.commitImport(
      { ...batch, id: "batch-2" },
      false,
    );
    assert.equal(second.imported, 0);
    assert.equal(second.skippedDuplicates, 1);
    assert.equal(second.duplicates[0].name, "Factorio");

    const persisted = JSON.parse(await readFile(storePath, "utf8")) as {
      schemaVersion: number;
      games: unknown[];
      imports: unknown[];
    };
    assert.equal(persisted.schemaVersion, 5);
    assert.equal(persisted.games.length, 1);
    assert.equal(persisted.imports.length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("resolves an import cover only for rows that enter the library", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-store-cover-resolver-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));
  const parsed = parseTextFile(
    "2022 games.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nFactorio;08/01/22;8;-",
  );
  const batch = {
    id: "cover-resolver-batch",
    createdAt: new Date().toISOString(),
    files: [parsed],
  };
  const cover = {
    provider: "howlongtobeat" as const,
    key: "cover-factorio.webp",
    title: "Factorio",
    sourceId: "123",
    sourceUrl: "https://howlongtobeat.com/game/123",
  };
  let calls = 0;

  try {
    const first = await repository.commitImport(batch, false, async () => {
      calls += 1;
      return cover;
    });
    assert.equal(calls, 1);
    assert.deepEqual((await repository.load()).games[0].cover, cover);

    await repository.commitImport(
      { ...batch, id: "cover-resolver-duplicate" },
      false,
      async () => {
        calls += 1;
        return cover;
      },
    );
    assert.equal(calls, 1);
    assert.equal(first.coverImport.enabled, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("manual entries can be updated and deleted without touching source files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-manual-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));

  try {
    const created = await repository.createGame({
      name: "Manual game",
      date: "2026-08-02",
      year: 2026,
      score: 9,
      recommendation: null,
      notes: "A note",
    });
    assert.equal(created.games[0].platform, null);
    const id = created.games[0].id;
    await assert.rejects(
      repository.updateGame(id, {
        name: "Conflicting update",
        date: "2026-08-03",
        year: 2026,
        score: 8,
        recommendation: "Recomendado",
        notes: "",
      }),
      /modos incompatibles/,
    );
    const updated = await repository.updateGame(id, {
      name: "Updated game",
      date: "2026-08-03",
      year: 2026,
      score: null,
      recommendation: "Recomendado",
      platform: "Xbox",
      notes: "Updated note",
    });
    assert.equal(updated.games[0].name, "Updated game");
    assert.equal(updated.games[0].ratingMode, "semicolon-recommendation");
    assert.equal(updated.games[0].platform, "Xbox");
    const preservedPlatform = await repository.updateGame(id, {
      name: "Updated again",
      date: "2026-08-03",
      year: 2026,
      score: null,
      recommendation: "Recomendado",
      notes: "Updated once more",
    });
    assert.equal(preservedPlatform.games[0].platform, "Xbox");
    const deleted = await repository.deleteGames([id]);
    assert.equal(deleted.games.length, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("persists Neo statuses independently and updates only the selected status", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-storage-status-"));
  const repository = new JsonGameRepository(join(directory, "library.json"));

  try {
    const created = await repository.createGame({
      name: "Status game",
      date: "2026-08-02",
      year: 2026,
      score: 9.24,
      recommendation: null,
      notes: "",
      completed: false,
      platinum: false,
      favorite: false,
    });
    const id = created.games[0].id;
    const completed = await repository.updateGameStatus(id, "completed", true);
    assert.equal(completed.games[0].completed, true);
    assert.equal(completed.games[0].platinum, false);
    assert.equal(completed.games[0].favorite, false);
    const favorite = await repository.updateGameStatus(id, "favorite", true);
    assert.equal(favorite.games[0].completed, true);
    assert.equal(favorite.games[0].favorite, true);
    assert.equal(favorite.games[0].score, 9.24);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("clearing a platform removes its preserved raw value", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-storage-platform-clear-"));
  const repository = new JsonGameRepository(join(directory, "library.json"));

  try {
    const parsed = parseTextFile(
      "2026 games.txt",
      "Juego;fechas;Recomendado/No Recomendado + extra;comentarios adicionales;Plataforma\nUnknown platform game;03/02/26;Recomendado;-;Mystery Box",
    );
    await repository.commitImport(
      {
        id: "platform-clear-batch",
        createdAt: new Date().toISOString(),
        files: [parsed],
      },
      false,
      undefined,
      [createImportRowKey(parsed.rows[0].source)],
    );

    const game = (await repository.load()).games[0];
    assert.equal(game.extra[RAW_PLATFORM_EXTRA_KEY], "Mystery Box");
    await repository.updateGame(game.id, {
      name: game.name,
      date: game.date,
      score: game.score,
      recommendation: game.recommendation,
      platform: null,
      notes: game.notes,
      year: game.year,
    });

    const updated = (await repository.load()).games[0];
    assert.equal(updated.platform, null);
    assert.equal(updated.extra[RAW_PLATFORM_EXTRA_KEY], undefined);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reset clears the internal library and audit history", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-reset-store-"));
  const storePath = join(directory, "library.v1.json");
  const repository = new JsonGameRepository(storePath);
  const parsed = parseTextFile(
    "2024 games.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nCeleste;08/01/24;9;-",
  );

  try {
    await repository.commitImport(
      {
        id: "reset-batch",
        createdAt: new Date().toISOString(),
        files: [parsed],
      },
      false,
    );
    await repository.reset();
    assert.deepEqual(await repository.load(), {
      schemaVersion: 5,
      games: [],
      imports: [],
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("migrates schema 1 once, backs up the exact source, and preserves rating conflicts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-migration-"));
  const storePath = join(directory, "library.v1.json");
  const legacy = {
    schemaVersion: 1,
    games: [
      {
        id: "score-game",
        name: "Score game",
        year: 2024,
        date: "2024-01-02",
        score: 8,
        recommendation: null,
        notes: "score",
        extra: {},
        source: {
          filePath: "C:/history/2024 games.txt",
          line: 2,
          format: "semicolon-score",
          raw: "Score game;02/01/24;8;score",
        },
        createdAt: "2024-01-02T00:00:00.000Z",
        updatedAt: "2024-01-02T00:00:00.000Z",
      },
      {
        id: "mixed-game",
        name: "Mixed game",
        year: 2024,
        date: "2024-01-03",
        score: 7,
        recommendation: "recomendado",
        notes: "mixed",
        extra: { keep: "this" },
        source: {
          filePath: "C:/history/unknown.txt",
          line: 4,
          format: "unknown",
          raw: "Mixed game;03/01/24;7;recomendado;mixed",
        },
        createdAt: "2024-01-03T00:00:00.000Z",
        updatedAt: "2024-01-03T00:00:00.000Z",
      },
    ],
    imports: [],
  };
  const original = JSON.stringify(legacy, null, 2);
  await writeFile(storePath, original, "utf8");

  try {
    const repository = new JsonGameRepository(storePath);
    const state = await repository.load();
    assert.equal(state.schemaVersion, 5);
    assert.equal(state.games[0].ratingMode, "semicolon-score");
    assert.equal(state.games[1].ratingMode, "mixed");
    assert.equal(state.games[1].needsReview, true);
    assert.equal(state.games[1].recommendation, "Recomendado");
    assert.equal(state.games[1].extra.keep, "this");
    assert.equal(state.games[1].extra["raw-recommendation"], "recomendado");
    assert.deepEqual(state.games[1].ratingConflict, {
      score: 7,
      recommendation: "Recomendado",
      rawScore: "7",
      rawRecommendation: "recomendado",
    });
    assert.equal(state.games[1].source.filePath, "C:/history/unknown.txt");
    assert.equal(state.games[0].platform, null);
    assert.equal(state.games[1].platform, null);
    assert.equal(state.games[0].cover, null);
    assert.equal(state.games[1].cover, null);
    assert.equal(await readFile(`${storePath}.bak`, "utf8"), original);
    assert.equal(JSON.parse(await readFile(storePath, "utf8")).schemaVersion, 5);

    const secondLoad = await new JsonGameRepository(storePath).load();
    assert.equal(secondLoad.schemaVersion, 5);
    assert.equal(await readFile(`${storePath}.bak`, "utf8"), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("does not turn corrupt JSON into an empty writable library", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-corrupt-"));
  const storePath = join(directory, "library.v1.json");
  const corrupt = "{not valid json";
  await writeFile(storePath, corrupt, "utf8");
  const repository = new JsonGameRepository(storePath);

  try {
    await assert.rejects(repository.load(), /JSON corrupto/);
    assert.equal(await readFile(storePath, "utf8"), corrupt);
    await assert.rejects(
      repository.createGame({
        name: "Would not be written",
        date: "2026-08-03",
        year: 2026,
        score: null,
        recommendation: null,
        notes: "",
      }),
      /JSON corrupto/,
    );
    assert.equal(await readFile(storePath, "utf8"), corrupt);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("migrates schema 2 to schema 5 with a backup and preserves unknown platforms", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-schema-2-migration-"));
  const storePath = join(directory, "library.v1.json");
  const schemaTwo = {
    schemaVersion: 2,
    games: [
      {
        id: "old-game",
        name: "Old game",
        year: 2026,
        date: "2026-01-02",
        score: null,
        recommendation: "Recomendado",
        notes: "kept",
        extra: { keep: "this" },
        source: {
          filePath: "C:/history/2026 games.txt",
          line: 2,
          format: "semicolon-recommendation",
          raw: "Old game;02/01/26;Recomendado;kept",
        },
        ratingMode: "semicolon-recommendation",
        needsReview: false,
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
      {
        id: "unknown-platform-game",
        name: "Unknown platform game",
        year: 2026,
        date: "2026-01-03",
        score: null,
        recommendation: "Recomendado",
        platform: "Android",
        notes: "unknown",
        extra: {},
        source: {
          filePath: "C:/history/2026 platform.txt",
          line: 3,
          format: "semicolon-recommendation-platform",
          raw: "Unknown platform game;03/01/26;Recomendado;;Android",
        },
        ratingMode: "semicolon-recommendation",
        needsReview: false,
        createdAt: "2026-01-03T00:00:00.000Z",
        updatedAt: "2026-01-03T00:00:00.000Z",
      },
    ],
    imports: [],
  };
  const original = JSON.stringify(schemaTwo, null, 2);
  await writeFile(storePath, original, "utf8");

  try {
    const state = await new JsonGameRepository(storePath).load();
    assert.equal(state.schemaVersion, 5);
    assert.equal(state.games[0].platform, null);
    assert.equal(state.games[0].extra.keep, "this");
    assert.equal(state.games[1].platform, null);
    assert.equal(state.games[1].needsReview, true);
    assert.equal(state.games[1].extra["raw-platform"], "Android");
    assert.equal(await readFile(`${storePath}.bak`, "utf8"), original);
    assert.equal(JSON.parse(await readFile(storePath, "utf8")).schemaVersion, 5);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("migrates schema 3 records without a cover to schema 5", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-schema-3-migration-"));
  const storePath = join(directory, "library.v1.json");
  const schemaThree = {
    schemaVersion: 3,
    games: [
      {
        id: "schema-three-game",
        name: "Schema three game",
        year: 2026,
        date: "2026-08-04",
        score: null,
        recommendation: "Recomendado",
        platform: null,
        notes: "",
        extra: {},
        source: {
          filePath: "manual",
          line: 0,
          format: "unknown",
          raw: "",
        },
        ratingMode: "semicolon-recommendation",
        needsReview: false,
        createdAt: "2026-08-04T00:00:00.000Z",
        updatedAt: "2026-08-04T00:00:00.000Z",
      },
    ],
    imports: [],
  };
  const original = JSON.stringify(schemaThree, null, 2);
  await writeFile(storePath, original, "utf8");

  try {
    const state = await new JsonGameRepository(storePath).load();
    assert.equal(state.schemaVersion, 5);
    assert.equal(state.games[0].cover, null);
    assert.equal(await readFile(`${storePath}.bak`, "utf8"), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("validates draft basics and rejects conflicting rating values", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-validation-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));

  try {
    await assert.rejects(
      repository.createGame({
        name: " ",
        date: "2026-08-03",
        year: 2026,
        score: 8,
        recommendation: null,
        notes: "",
      }),
      /nombre.*obligatorio/,
    );
    await assert.rejects(
      repository.createGame({
        name: "Conflicting",
        date: "2026-08-03",
        year: 2026,
        score: 8,
        recommendation: "Recomendado",
        notes: "",
      }),
      /modos incompatibles/,
    );
    await assert.rejects(
      repository.createGame({
        name: "Bad date",
        date: "2026-02-31",
        year: 2026,
        score: null,
        recommendation: null,
        notes: "",
      }),
      /fecha.*válida/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("skips review rows by default and clears the warning after a valid edit", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-review-rows-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));
  const parsed = parseTextFile(
    "2024 missing-date.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nIncomplete game;;8;source",
  );
  const batch = {
    id: "review-batch",
    createdAt: new Date().toISOString(),
    files: [parsed],
  };

  try {
    const skipped = await repository.commitImport(batch, false);
    assert.equal(skipped.imported, 0);
    assert.equal(skipped.skippedReview, 1);
    assert.equal((await repository.load()).games.length, 0);

    const included = await repository.commitImport(
      { ...batch, id: "review-batch-included" },
      false,
      undefined,
      [createImportRowKey(parsed.rows[0].source)],
    );
    assert.equal(included.imported, 1);
    assert.equal(included.importedReview, 1);
    const incomplete = (await repository.load()).games[0];
    assert.equal(incomplete.needsReview, true);
    assert.deepEqual(incomplete.reviewReasons, ["missing-date"]);

    const fixed = await repository.updateGame(incomplete.id, {
      name: incomplete.name,
      date: "2024-01-02",
      year: 2024,
      score: 8,
      recommendation: null,
      notes: incomplete.notes,
    });
    assert.equal(fixed.games[0].needsReview, false);
    assert.deepEqual(fixed.games[0].reviewReasons, []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("imports only the review rows selected by the user", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-review-selection-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));
  const parsed = parseTextFile(
    "2024 selected-review.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nKeep this;;8;source\nSkip this;;9;source",
  );

  try {
    const result = await repository.commitImport(
      {
        id: "selected-review-batch",
        createdAt: new Date().toISOString(),
        files: [parsed],
      },
      false,
      undefined,
      [createImportRowKey(parsed.rows[0].source)],
    );
    assert.equal(result.imported, 1);
    assert.equal(result.skippedReview, 1);
    assert.equal((await repository.load()).games[0].name, "Keep this");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("allows incomplete manual entries while marking them for review", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-manual-review-"));
  const repository = new JsonGameRepository(join(directory, "library.v1.json"));

  try {
    const created = await repository.createGame({
      name: "Missing date game",
      date: "",
      year: null,
      score: null,
      recommendation: null,
      notes: "to complete",
    });
    assert.equal(created.games[0].needsReview, true);
    assert.deepEqual(created.games[0].reviewReasons, ["missing-date"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
