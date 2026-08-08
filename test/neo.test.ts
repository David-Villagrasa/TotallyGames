import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createNeoCsvExportResult,
  parseNeoCsvFile,
} from "../src/domain/neo";
import {
  parseNeoWorkbookFile,
  writeNeoWorkbook,
} from "../src/main/neo-excel";
import type { GameEntry } from "../src/domain/types";

const game: GameEntry = {
  id: "neo-game",
  name: "Example Game",
  year: 2026,
  date: "2026-01-01",
  score: 9.24,
  recommendation: null,
  platform: null,
  cover: null,
  notes: "Keep this note",
  extra: {},
  source: { filePath: "manual", line: 0, format: "neo-xlsx", raw: "" },
  ratingMode: "semicolon-score",
  completed: true,
  platinum: true,
  favorite: true,
  needsReview: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("exports Neo CSV with explicit status columns and reads it back", () => {
  const exported = createNeoCsvExportResult("neo.csv", [game]);
  assert.match(
    exported.content,
    /^Juego,Nota,Fecha,Completado,Comentarios,Platinado,Favorito\n/,
  );
  const imported = parseNeoCsvFile("neo.csv", exported.content);
  assert.equal(imported.format, "neo-csv");
  assert.equal(imported.year, 2026);
  assert.equal(imported.rows[0].score, 9.24);
  assert.equal(imported.rows[0].date, "2026-01-01");
  assert.equal(imported.rows[0].completed, true);
  assert.equal(imported.rows[0].platinum, true);
  assert.equal(imported.rows[0].favorite, true);
  assert.equal(imported.rows[0].notes, "Keep this note");
});

test("writes and reads Neo Excel status fills", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dgt-neo-"));
  const filePath = join(directory, "Juegos jugados.xlsx");
  try {
    await writeNeoWorkbook(filePath, [game]);
    const imported = await parseNeoWorkbookFile(filePath);
    assert.equal(imported.format, "neo-xlsx");
    assert.equal(imported.yearSource, "content");
    assert.equal(imported.rows.length, 1);
    assert.equal(imported.rows[0].score, 9.24);
    assert.equal(imported.rows[0].date, "2026-01-01");
    assert.equal(imported.rows[0].completed, true);
    assert.equal(imported.rows[0].platinum, true);
    assert.equal(imported.rows[0].favorite, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("keeps unknown Neo status markers visible for review", () => {
  const imported = parseNeoCsvFile(
    "neo.csv",
    "Juego,Nota,Fecha,Completado,Comentarios,Platinado,Favorito\nGame,8,2026,maybe,note,,",
  );
  assert.equal(imported.rows[0].needsReview, true);
  assert.equal(imported.rows[0].reviewReasons?.includes("unknown-status"), true);
  assert.equal(imported.rows[0].extra["neo-status-completed"], "maybe");
  assert.equal(imported.warnings[0].code, "unknown-status");
});
