import type {
  CanonicalRatingMode,
  GameDraft,
  ReviewReason,
} from "./types";
import { isGameCover } from "./cover";
import { addReviewReason } from "./review";
import {
  canonicalizePlatform,
  RAW_PLATFORM_EXTRA_KEY,
} from "./platform";
import {
  canonicalizeRecommendation,
  isValidScore,
  normalizeScore,
} from "./rating";

export interface ValidatedGameDraft {
  name: string;
  date: string;
  score: number | null;
  recommendation: string | null;
  platform: ReturnType<typeof canonicalizePlatform>;
  cover: GameDraft["cover"];
  notes: string;
  year: number | null;
  ratingMode: CanonicalRatingMode;
  completed: boolean;
  platinum: boolean;
  favorite: boolean;
  extra: Record<string, string>;
  needsReview: boolean;
  reviewReasons: ReviewReason[];
}

function invalid(message: string): never {
  throw new Error(message);
}

export function isValidDate(value: string): boolean {
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

  if (typeof candidate.date !== "string") {
    invalid("La fecha no tiene un formato valido.");
  }
  const date = candidate.date.trim();
  if (date && !isValidDate(date)) {
    invalid("La fecha debe tener el formato YYYY-MM-DD y ser válida.");
  }

  if (candidate.notes !== undefined && typeof candidate.notes !== "string") {
    invalid("Las notas no tienen un formato valido.");
  }

  const score = candidate.score === null || candidate.score === undefined
    ? null
    : candidate.score;
  if (score !== null && !isValidScore(score)) {
    invalid(
      "La puntuación debe estar entre 0 y 10 y tener como máximo dos decimales.",
    );
  }

  const statuses = ["completed", "platinum", "favorite"] as const;
  for (const status of statuses) {
    const value = candidate[status];
    if (value !== undefined && typeof value !== "boolean") {
      invalid(`El estado ${status} no tiene un formato valido.`);
    }
  }

  const rawRecommendation =
    candidate.recommendation === null || candidate.recommendation === undefined
      ? null
      : candidate.recommendation;
  let recommendation: string | null = null;
  if (rawRecommendation !== null) {
    if (typeof rawRecommendation !== "string") {
      invalid("La recomendación no tiene un formato válido.");
    }
    if (rawRecommendation.trim()) {
      const canonical = canonicalizeRecommendation(rawRecommendation);
      if (!canonical) {
        invalid("La recomendación no está reconocida.");
      }
      recommendation = canonical;
    }
  }

  if (score !== null && recommendation !== null) {
    invalid("La puntuación y la recomendación son modos incompatibles.");
  }

  const rawPlatform =
    candidate.platform === null || candidate.platform === undefined
      ? null
      : candidate.platform;
  let platform: ReturnType<typeof canonicalizePlatform> = null;
  const extra: Record<string, string> = {};
  const reviewReasons: ReviewReason[] = [];
  if (!date) addReviewReason(reviewReasons, "missing-date");
  if (rawPlatform !== null) {
    if (typeof rawPlatform !== "string") {
      invalid("La plataforma no tiene un formato valido.");
    }
    const trimmedPlatform = rawPlatform.trim();
    if (trimmedPlatform) {
      platform = canonicalizePlatform(trimmedPlatform);
      if (platform && platform !== trimmedPlatform) {
        extra[RAW_PLATFORM_EXTRA_KEY] = trimmedPlatform;
      } else if (!platform) {
        addReviewReason(reviewReasons, "unknown-platform");
        extra[RAW_PLATFORM_EXTRA_KEY] = trimmedPlatform;
      }
    }
  }

  const cover =
    candidate.cover === undefined || candidate.cover === null
      ? candidate.cover ?? null
      : isGameCover(candidate.cover)
        ? candidate.cover
        : invalid("La portada no tiene un formato valido.");

  const requestedMode = candidate.ratingMode;
  if (
    requestedMode !== undefined &&
    requestedMode !== "legacy-2021" &&
    requestedMode !== "semicolon-score" &&
    requestedMode !== "semicolon-recommendation"
  ) {
    invalid("El modo de puntuación no es válido.");
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
    invalid("El modo legacy-2021 no admite valores de puntuación.");
  }
  if (ratingMode === "semicolon-score" && recommendation !== null) {
    invalid("El modo semicolon-score no admite recomendaciones.");
  }
  if (ratingMode === "semicolon-recommendation" && score !== null) {
    invalid("El modo semicolon-recommendation no admite puntuaciones.");
  }

  let year: number | null = null;
  if (date) {
    year = Number(date.slice(0, 4));
    if (
      candidate.year !== undefined &&
      candidate.year !== null &&
      (typeof candidate.year !== "number" ||
        !Number.isInteger(candidate.year) ||
        candidate.year !== year)
    ) {
      invalid("El año no coincide con la fecha.");
    }
  } else if (candidate.year !== undefined && candidate.year !== null) {
    if (
      typeof candidate.year !== "number" ||
      !Number.isInteger(candidate.year) ||
      candidate.year < 1
    ) {
      invalid("El año no es válido.");
    }
    year = candidate.year;
  }

  return {
    name: candidate.name.trim(),
    date,
    score: score === null ? null : normalizeScore(score as number),
    recommendation,
    platform,
    cover,
    notes: typeof candidate.notes === "string" ? candidate.notes : "",
    year,
    ratingMode,
    completed: candidate.completed === true,
    platinum: candidate.platinum === true,
    favorite: candidate.favorite === true,
    extra,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
  };
}
