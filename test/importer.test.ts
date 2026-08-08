import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { parseTextFile } from "../src/domain/importer";

const fixture = (name: string) => join(process.cwd(), "test", "fixtures", name);

async function parseFixture(name: string, fileName: string) {
  const path = fixture(name);
  return parseTextFile(fileName, await readFile(path, "utf8"));
}

test("detects and parses the legacy 2021 triple-slash format", async () => {
  const result = await parseFixture(
    "legacy-2021.txt",
    "2021 juegos jugados.txt",
  );

  assert.equal(result.format, "legacy-2021");
  assert.equal(result.year, 2021);
  assert.equal(result.yearSource, "filename");
  assert.equal(result.rows.length, 32);
  assert.equal(result.rows[5].name, "Code Vein");
  assert.equal(result.rows[5].notes, "sin dlc ni ng+x");
  assert.equal(result.rows[5].ratingMode, "legacy-2021");
  assert.ok(
    result.preservedRows.some((row) => row.raw.includes("Top 5 Peores")),
  );
});

test("detects score tables and keeps TOP5 summary rows", async () => {
  const result = await parseFixture(
    "score-2022.txt",
    "2022 juegos jugados.txt",
  );

  assert.equal(result.format, "semicolon-score");
  assert.equal(result.year, 2022);
  assert.equal(result.rows.length, 6);
  assert.equal(result.rows[0].score, 8);
  assert.equal(result.rows[0].ratingMode, "semicolon-score");
  assert.equal(result.rows[4].name, "Elden Ring");
  assert.ok(
    result.preservedRows.some(
      (row) => row.kind === "metadata" && row.raw.startsWith("TOP5"),
    ),
  );
});

test("keeps invalid dates as reviewable rows without losing the raw row", async () => {
  const result = await parseFixture(
    "score-2023.txt",
    "2023 juegos jugados.txt",
  );

  assert.equal(result.rows.length, 6);
  assert.equal(
    result.errors.filter((entry) => entry.code === "invalid-date").length,
    1,
  );
  const reviewRow = result.rows.find((row) =>
    row.name.includes("We Were Here Together"),
  );
  assert.equal(reviewRow?.date, "");
  assert.equal(reviewRow?.needsReview, true);
  assert.equal(reviewRow?.extra["raw-date"], "31/11/23");
});

test("detects recommendation tables from 2025 and preserves verdict text", async () => {
  const result = await parseFixture(
    "recommendation-2025.txt",
    "2025 juegos jugados.txt",
  );

  assert.equal(result.format, "semicolon-recommendation");
  assert.equal(result.year, 2025);
  assert.equal(result.rows[0].recommendation, "Recomendado");
  assert.equal(result.rows[3].recommendation, "No Recomendado");
  assert.equal(result.rows[3].score, null);
  assert.equal(result.rows[0].ratingMode, "semicolon-recommendation");
});

test("supports the 2026 recommendation vocabulary", async () => {
  const result = await parseFixture(
    "recommendation-2026.txt",
    "2026 juegos jugados.txt",
  );

  assert.equal(result.format, "semicolon-recommendation");
  assert.equal(result.rows.length, 5);
  assert.equal(result.rows[0].recommendation, "Muy Recomendado");
  assert.equal(result.rows[3].recommendation, "Poco Recomendado");
});

test("reports unknown formats instead of guessing", () => {
  const result = parseTextFile(
    "2027 unknown.txt",
    "this is not a supported history",
  );

  assert.equal(result.format, "unknown");
  assert.equal(result.rows.length, 0);
  assert.equal(result.errors[0].code, "unknown-format");
  assert.equal(result.preservedRows.length, 1);
});

test("keeps additional semicolon columns in the canonical row", () => {
  const result = parseTextFile(
    "2024 extra.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales;plataforma\nGame;01/01/24;8;ok;PC",
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].extra["column-plataforma"], "PC");
});

test("recognizes recommendation case variants and keeps the raw cell", () => {
  const result = parseTextFile(
    "2026 recommendation.txt",
    "Juego;fechas;Recomendado/No Recomendado + extra;comentarios adicionales\nGame;01/01/26;rEcOmEnDaDo;ok\nOther;02/01/26;NO RECOMENDADO;",
  );

  assert.equal(result.rows[0].recommendation, "Recomendado");
  assert.equal(result.rows[1].recommendation, "No Recomendado");
  assert.equal(result.rows[0].needsReview, false);
  assert.equal(result.rows[0].extra["raw-recommendation"], "rEcOmEnDaDo");
  assert.equal(result.rows[1].extra["raw-recommendation"], "NO RECOMENDADO");
});

test("keeps unknown recommendations visible without guessing", () => {
  const result = parseTextFile(
    "2026 recommendation.txt",
    "Juego;fechas;Recomendado/No Recomendado + extra;comentarios adicionales\nGame;01/01/26;Maybe;source",
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].recommendation, "Maybe");
  assert.equal(result.rows[0].needsReview, true);
  assert.equal(result.rows[0].extra["raw-recommendation"], "Maybe");
  assert.equal(result.warnings[0].code, "unknown-recommendation");
});

test("parses mixed rating columns without discarding either value", () => {
  const result = parseTextFile(
    "2024 mixed.txt",
    "Juego;fechas;nota sobre 10;Recomendado/No Recomendado + extra;comentarios adicionales\nGame;01/01/24;8;rEcOmEnDaDo;both values",
  );

  assert.equal(result.format, "semicolon-mixed");
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].ratingMode, "mixed");
  assert.equal(result.rows[0].needsReview, true);
  assert.equal(result.rows[0].score, 8);
  assert.equal(result.rows[0].recommendation, "Recomendado");
  assert.deepEqual(result.rows[0].ratingConflict, {
    score: 8,
    recommendation: "Recomendado",
    rawScore: "8",
    rawRecommendation: "rEcOmEnDaDo",
  });
  assert.equal(result.warnings.at(-1)?.code, "mixed-rating-fields");
  assert.equal(result.rows[0].source.raw, "Game;01/01/24;8;rEcOmEnDaDo;both values");
});

test("keeps invalid scores as reviewable rows while preserving the original value", () => {
  const result = parseTextFile(
    "2024 invalid.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nGame;01/01/24;11;source",
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.errors[0].code, "invalid-score");
  assert.equal(result.rows[0].needsReview, true);
  assert.equal(result.rows[0].score, null);
  assert.equal(result.rows[0].extra["raw-score"], "11");
});

test("keeps a game with a missing date visible for an explicit review decision", () => {
  const result = parseTextFile(
    "2024 missing-date.txt",
    "Juego;fechas;nota sobre 10;comentarios adicionales\nGame;;8;source",
  );

  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].date, "");
  assert.equal(result.rows[0].needsReview, true);
  assert.equal(result.errors[0].code, "missing-date");
});
