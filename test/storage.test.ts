import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { parseTextFile } from "../src/domain/importer";
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
    assert.equal(persisted.schemaVersion, 2);
    assert.equal(persisted.games.length, 1);
    assert.equal(persisted.imports.length, 2);
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
      notes: "Updated note",
    });
    assert.equal(updated.games[0].name, "Updated game");
    assert.equal(updated.games[0].ratingMode, "semicolon-recommendation");
    const deleted = await repository.deleteGames([id]);
    assert.equal(deleted.games.length, 0);
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
      schemaVersion: 2,
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
    assert.equal(state.schemaVersion, 2);
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
    assert.equal(await readFile(`${storePath}.bak`, "utf8"), original);
    assert.equal(JSON.parse(await readFile(storePath, "utf8")).schemaVersion, 2);

    const secondLoad = await new JsonGameRepository(storePath).load();
    assert.equal(secondLoad.schemaVersion, 2);
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
      /fecha.*valida/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
