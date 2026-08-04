import type { CanonicalRecommendation } from "./types";
import { normalizeText } from "./text";

export const RECOMMENDATION_LABELS: readonly CanonicalRecommendation[] = [
  "No Recomendado",
  "Poco Recomendado",
  "Recomendado",
  "Muy Recomendado",
];

export const DEFAULT_NO_RATING_SCORE = 5;
export const DEFAULT_NO_RATING_RECOMMENDATION: CanonicalRecommendation =
  "Recomendado";

export const RAW_SCORE_EXTRA_KEY = "raw-score";
export const RAW_RECOMMENDATION_EXTRA_KEY = "raw-recommendation";
export const RATING_CONFLICT_EXTRA_KEY = "rating-conflict";

const RECOMMENDATION_SCORES: Record<CanonicalRecommendation, number> = {
  "No Recomendado": 1,
  "Poco Recomendado": 3,
  Recomendado: 6,
  "Muy Recomendado": 9,
};

function normalizedRecommendation(value: string): string {
  return normalizeText(value);
}

export function canonicalizeRecommendation(
  value: unknown,
): CanonicalRecommendation | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizedRecommendation(value);
  return (
    RECOMMENDATION_LABELS.find(
      (label) => normalizedRecommendation(label) === normalized,
    ) ?? null
  );
}

export const recognizeRecommendation = canonicalizeRecommendation;
export const normalizeRecommendation = canonicalizeRecommendation;

export function isCanonicalRecommendation(
  value: unknown,
): value is CanonicalRecommendation {
  return canonicalizeRecommendation(value) !== null;
}

export function scoreToRecommendation(
  score: number | null | undefined,
): CanonicalRecommendation {
  if (score === null || score === undefined) {
    return DEFAULT_NO_RATING_RECOMMENDATION;
  }
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    throw new RangeError("La puntuacion debe ser un entero entre 0 y 10.");
  }
  if (score <= 2) return "No Recomendado";
  if (score <= 4) return "Poco Recomendado";
  if (score <= 7) return "Recomendado";
  return "Muy Recomendado";
}

export const recommendationFromScore = scoreToRecommendation;

export function recommendationToScore(value: unknown): number {
  const canonical = canonicalizeRecommendation(value);
  return canonical === null
    ? DEFAULT_NO_RATING_SCORE
    : RECOMMENDATION_SCORES[canonical];
}

export const scoreFromRecommendation = recommendationToScore;

export function isValidScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10
  );
}
