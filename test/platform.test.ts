import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizePlatform,
  PLATFORM_LABELS,
  RAW_PLATFORM_EXTRA_KEY,
  isPlatform,
} from "../src/domain/platform";
import { serializeGames } from "../src/domain/exporter";
import { parseTextFile } from "../src/domain/importer";
import type { GameDraft, GameEntry } from "../src/domain/types";
import { validateGameDraft } from "../src/domain/validation";

const baseDraft = {
  name: "Platform game",
  date: "2026-01-02",
  score: null,
  recommendation: "Recomendado",
  notes: "",
  year: 2026,
  ratingMode: "semicolon-recommendation" as const,
};

test("defines and validates exactly the supported platforms", () => {
  assert.deepEqual([...PLATFORM_LABELS], [
    "Nintendo Switch",
    "Play Station",
    "PC - Steam",
    "PC - Emulated",
    "Xbox",
  ]);

  for (const label of PLATFORM_LABELS) {
    assert.equal(isPlatform(label), true);
    assert.equal(canonicalizePlatform(label), label);
  }

  assert.equal(canonicalizePlatform(" pc - steam "), "PC - Steam");
  assert.equal(canonicalizePlatform("Android"), null);
  assert.equal(isPlatform("Android"), false);
});

test("validates manual platform values and preserves unknown text", () => {
  const known = validateGameDraft({ ...baseDraft, platform: "Xbox" });
  assert.equal(known.platform, "Xbox");
  assert.deepEqual(known.extra, {});
  assert.equal(known.needsReview, false);

  const unknown = validateGameDraft({
    ...baseDraft,
    platform: "Android",
  } as unknown as GameDraft);
  assert.equal(unknown.platform, null);
  assert.equal(unknown.extra[RAW_PLATFORM_EXTRA_KEY], "Android");
  assert.equal(unknown.needsReview, true);

  assert.throws(
    () =>
      validateGameDraft({
        ...baseDraft,
        platform: 42,
      } as unknown as GameDraft),
    /plataforma.*formato/,
  );
});

test("detects, imports, and round-trips the recommendation-platform format", () => {
  const content = [
    "Juego;fechas;Recomendado/No Recomendado + extra;comentarios adicionales;Plataforma",
    "Switch game;01/01/26;Recomendado;note;Nintendo Switch",
    "Play game;02/01/26;Muy Recomendado;;Play Station",
    "Steam game;03/01/26;Poco Recomendado;;PC - Steam",
    "Emulated game;04/01/26;Recomendado;;PC - Emulated",
    "Xbox game;05/01/26;No Recomendado;;Xbox",
    "No platform;06/01/26;Recomendado;blank;",
    "Unknown platform;07/01/26;Recomendado;;Android",
  ].join("\n");

  const imported = parseTextFile("2026 platform.txt", content);
  assert.equal(imported.format, "semicolon-recommendation-platform");
  assert.deepEqual(imported.rows.map((row) => row.platform), [
    "Nintendo Switch",
    "Play Station",
    "PC - Steam",
    "PC - Emulated",
    "Xbox",
    null,
    null,
  ]);
  assert.equal(imported.rows[6].needsReview, true);
  assert.equal(
    imported.rows[6].extra[RAW_PLATFORM_EXTRA_KEY],
    "Android",
  );
  assert.equal(imported.warnings.at(-1)?.code, "unknown-platform");

  const entries: GameEntry[] = imported.rows.map((row, index) => ({
    ...row,
    id: `game-${index}`,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
  const exported = serializeGames(
    entries,
    "semicolon-recommendation-platform",
  );
  assert.match(
    exported.content,
    /^Juego;fechas;Recomendado\/No Recomendado \+ extra;comentarios adicionales;Plataforma\n/,
  );
  assert.match(exported.content, /No platform;06\/01\/26;Recomendado;blank;\n/);
  assert.match(exported.content, /Unknown platform;07\/01\/26;Recomendado;;Android\n/);

  const roundTrip = parseTextFile("2026 round-trip.txt", exported.content);
  assert.deepEqual(
    roundTrip.rows.map((row) => row.platform),
    imported.rows.map((row) => row.platform),
  );
  assert.equal(
    roundTrip.rows[6].extra[RAW_PLATFORM_EXTRA_KEY],
    "Android",
  );
});
