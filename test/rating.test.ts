import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalizeRecommendation,
  recommendationToScore,
  scoreToRecommendation,
  DEFAULT_NO_RATING_RECOMMENDATION,
  DEFAULT_NO_RATING_SCORE,
  isValidScore,
  normalizeScore,
} from "../src/domain/rating";

test("recognizes canonical recommendation labels case-insensitively", () => {
  assert.equal(canonicalizeRecommendation("muy recomendado"), "Muy Recomendado");
  assert.equal(canonicalizeRecommendation("POCO RECOMENDADO"), "Poco Recomendado");
  assert.equal(canonicalizeRecommendation("No Recomendado"), "No Recomendado");
  assert.equal(canonicalizeRecommendation("not sure"), null);
});

test("maps score ranges and recommendation midpoints", () => {
  assert.equal(scoreToRecommendation(0), "No Recomendado");
  assert.equal(scoreToRecommendation(2), "No Recomendado");
  assert.equal(scoreToRecommendation(3), "Poco Recomendado");
  assert.equal(scoreToRecommendation(4), "Poco Recomendado");
  assert.equal(scoreToRecommendation(5), "Recomendado");
  assert.equal(scoreToRecommendation(7), "Recomendado");
  assert.equal(scoreToRecommendation(8), "Muy Recomendado");
  assert.equal(scoreToRecommendation(10), "Muy Recomendado");
  assert.equal(recommendationToScore("No recomendado"), 1);
  assert.equal(recommendationToScore("Poco recomendado"), 3);
  assert.equal(recommendationToScore("recomendado"), 6);
  assert.equal(recommendationToScore("MUY RECOMENDADO"), 9);
});

test("uses the defined no-rating fallbacks", () => {
  assert.equal(scoreToRecommendation(null), DEFAULT_NO_RATING_RECOMMENDATION);
  assert.equal(recommendationToScore(null), DEFAULT_NO_RATING_SCORE);
  assert.equal(recommendationToScore("unknown"), DEFAULT_NO_RATING_SCORE);
});

test("accepts and normalizes scores with at most two decimals", () => {
  assert.equal(isValidScore(9), true);
  assert.equal(isValidScore(9.2), true);
  assert.equal(isValidScore(9.24), true);
  assert.equal(normalizeScore(9.2), 9.2);
  assert.equal(normalizeScore(9.24), 9.24);
  assert.equal(isValidScore(9.999), false);
  assert.equal(isValidScore(-0.01), false);
  assert.equal(isValidScore(10.01), false);
});
