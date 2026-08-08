import test from "node:test";
import assert from "node:assert/strict";
import { serializeGames } from "../src/domain/exporter";
import type { GameEntry } from "../src/domain/types";

const game: GameEntry = {
  id: "game-1",
  name: "Outer Wilds",
  year: 2025,
  date: "2025-01-02",
  score: 8,
  recommendation: "Recomendado",
  platform: "Nintendo Switch",
  cover: null,
  notes: "A good journey",
  extra: {},
  source: { filePath: "manual", line: 0, format: "unknown", raw: "" },
  ratingMode: "mixed",
  completed: false,
  platinum: false,
  favorite: false,
  needsReview: true,
  ratingConflict: {
    score: 8,
    recommendation: "Recomendado",
  },
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-02T00:00:00.000Z",
};

test("exports the legacy 2021 shape without rating fields", () => {
  const result = serializeGames([game], "legacy-2021");

  assert.match(result.content, /Outer Wilds\s+\/\/\/\s+02\/01\/2025/);
  assert.doesNotMatch(result.content, /Puntuacion|Veredicto/);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.counts.omittedRatings, 1);
});

test("exports score and recommendation tables with their historical headers", () => {
  const score = serializeGames([game], "semicolon-score");
  const recommendation = serializeGames([game], "semicolon-recommendation");

  assert.match(
    score.content,
    /^Juego;fechas;nota sobre 10;comentarios adicionales/,
  );
  assert.match(score.content, /Outer Wilds;02\/01\/25;8;/);
  assert.match(
    recommendation.content,
    /^Juego;fechas;Recomendado\/No Recomendado \+ extra;comentarios adicionales/,
  );
  assert.match(recommendation.content, /Outer Wilds;02\/01\/25;Recomendado;/);
  assert.equal(score.warnings.length, 1);
  assert.equal(recommendation.warnings.length, 1);
  assert.equal(score.counts.conflicts, 1);
  assert.equal(recommendation.counts.conflicts, 1);
});

test("converts scores and recommendations using the rating rules", () => {
  const scoreGame = {
    ...game,
    score: 2,
    recommendation: null,
    ratingMode: "semicolon-score" as const,
    needsReview: false,
    ratingConflict: undefined,
  };
  const recommendationGame = {
    ...game,
    score: null,
    recommendation: "Poco Recomendado",
    ratingMode: "semicolon-recommendation" as const,
    needsReview: false,
    ratingConflict: undefined,
  };

  const recommendation = serializeGames([scoreGame], "semicolon-recommendation");
  const score = serializeGames([recommendationGame], "semicolon-score");

  assert.match(recommendation.content, /;No Recomendado;/);
  assert.match(score.content, /;3;/);
  assert.equal(recommendation.counts.scoreToRecommendation, 1);
  assert.equal(score.counts.recommendationToScore, 1);
  assert.match(recommendation.content, /Puntuacion: 2\/10/);
  assert.match(score.content, /Veredicto: Poco Recomendado/);
});

test("uses explicit fallbacks and warns for unknown recommendations", () => {
  const noRating = {
    ...game,
    score: null,
    recommendation: null,
    ratingMode: "legacy-2021" as const,
    needsReview: false,
    ratingConflict: undefined,
  };
  const unknown = {
    ...noRating,
    recommendation: "Maybe",
    ratingMode: "semicolon-recommendation" as const,
    needsReview: true,
  };

  const fallbackScore = serializeGames([noRating], "semicolon-score");
  const fallbackRecommendation = serializeGames(
    [noRating],
    "semicolon-recommendation",
  );
  const unknownScore = serializeGames([unknown], "semicolon-score");

  assert.match(fallbackScore.content, /;5;/);
  assert.match(fallbackRecommendation.content, /;Recomendado;/);
  assert.equal(fallbackScore.counts.noRatingFallback, 1);
  assert.equal(fallbackRecommendation.counts.noRatingFallback, 1);
  assert.match(unknownScore.content, /;5;/);
  assert.equal(unknownScore.counts.unknownRecommendations, 1);
  assert.ok(
    unknownScore.warnings.some((warning) => warning.includes("desconocida")),
  );
});
