import type { CanonicalRatingMode, GameDraft } from "./types";
import { canonicalizeRecommendation, isValidScore } from "./rating";

export interface ValidatedGameDraft {
  name: string;
  date: string;
  score: number | null;
  recommendation: string | null;
  notes: string;
  year: number;
  ratingMode: CanonicalRatingMode;
}

function invalid(message: string): never {
  throw new Error(message);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateGameDraft(draft: GameDraft): ValidatedGameDraft {
  if (!draft || typeof draft !== "object") {
    invalid("El borrador del juego no es valido.");
  }
  const candidate = draft as Partial<Record<keyof GameDraft, unknown>>;
  if (typeof candidate.name !== "string" || !candidate.name.trim()) {
    invalid("El nombre del juego es obligatorio.");
  }

  if (typeof candidate.date !== "string" || !isValidDate(candidate.date)) {
    invalid("La fecha debe tener el formato YYYY-MM-DD y ser valida.");
  }

  if (candidate.notes !== undefined && typeof candidate.notes !== "string") {
    invalid("Las notas no tienen un formato valido.");
  }

  const score = candidate.score === null || candidate.score === undefined
    ? null
    : candidate.score;
  if (score !== null && !isValidScore(score)) {
    invalid("La puntuacion debe ser un entero entre 0 y 10.");
  }

  const rawRecommendation =
    candidate.recommendation === null || candidate.recommendation === undefined
      ? null
      : candidate.recommendation;
  let recommendation: string | null = null;
  if (rawRecommendation !== null) {
    if (typeof rawRecommendation !== "string") {
      invalid("La recomendacion no tiene un formato valido.");
    }
    if (rawRecommendation.trim()) {
      const canonical = canonicalizeRecommendation(rawRecommendation);
      if (!canonical) {
        invalid("La recomendacion no esta reconocida.");
      }
      recommendation = canonical;
    }
  }

  if (score !== null && recommendation !== null) {
    invalid("La puntuacion y la recomendacion son modos incompatibles.");
  }

  const requestedMode = candidate.ratingMode;
  if (
    requestedMode !== undefined &&
    requestedMode !== "legacy-2021" &&
    requestedMode !== "semicolon-score" &&
    requestedMode !== "semicolon-recommendation"
  ) {
    invalid("El modo de puntuacion no es valido.");
  }

  const ratingMode: CanonicalRatingMode =
    requestedMode === undefined
      ? score !== null
        ? "semicolon-score"
        : recommendation !== null
          ? "semicolon-recommendation"
          : "legacy-2021"
      : requestedMode;

  if (ratingMode === "legacy-2021" && (score !== null || recommendation !== null)) {
    invalid("El modo legacy-2021 no admite valores de puntuacion.");
  }
  if (ratingMode === "semicolon-score" && recommendation !== null) {
    invalid("El modo semicolon-score no admite recomendaciones.");
  }
  if (ratingMode === "semicolon-recommendation" && score !== null) {
    invalid("El modo semicolon-recommendation no admite puntuaciones.");
  }

  const year = Number(candidate.date.slice(0, 4));
  if (
    candidate.year !== undefined &&
    candidate.year !== null &&
    (typeof candidate.year !== "number" ||
      !Number.isInteger(candidate.year) ||
      candidate.year !== year)
  ) {
    invalid("El anio no coincide con la fecha.");
  }

  return {
    name: candidate.name.trim(),
    date: candidate.date,
    score: score as number | null,
    recommendation,
    notes: typeof candidate.notes === "string" ? candidate.notes : "",
    year,
    ratingMode,
  };
}
