import type {
  ExportCounts,
  ExportFormat,
  ExportResult,
  GameEntry,
} from "./types";
import {
  canonicalizeRecommendation,
  DEFAULT_NO_RATING_RECOMMENDATION,
  DEFAULT_NO_RATING_SCORE,
  RAW_RECOMMENDATION_EXTRA_KEY,
  RAW_SCORE_EXTRA_KEY,
  recommendationToScore,
  scoreToRecommendation,
  isValidScore,
} from "./rating";

interface ExportDiagnostics {
  warnings: string[];
  counts: ExportCounts;
}

interface PreparedRow {
  score: string;
  recommendation: string;
  notes: string;
}

function emptyCounts(): ExportCounts {
  return {
    converted: 0,
    scoreToRecommendation: 0,
    recommendationToScore: 0,
    noRatingFallback: 0,
    omittedRatings: 0,
    conflicts: 0,
    unknownRecommendations: 0,
  };
}

function exportDate(date: string, format: ExportFormat): string {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return format === "legacy-2021"
    ? `${day}/${month}/${year}`
    : `${day}/${month}/${year.slice(-2)}`;
}

function cleanText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function csvField(value: string): string {
  const clean = cleanText(value);
  return /[;"\n]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

function addWarning(diagnostics: ExportDiagnostics, message: string): void {
  diagnostics.warnings.push(message);
}

function addConversion(
  diagnostics: ExportDiagnostics,
  kind: "scoreToRecommendation" | "recommendationToScore" | "noRatingFallback",
): void {
  diagnostics.counts.converted += 1;
  diagnostics.counts[kind] += 1;
}

function sourceRecommendation(game: GameEntry): string {
  return game.extra[RAW_RECOMMENDATION_EXTRA_KEY] ?? game.recommendation ?? "";
}

function sourceScore(game: GameEntry): string {
  return game.extra[RAW_SCORE_EXTRA_KEY] ??
    (game.score === null ? "" : `${game.score}/10`);
}

function markConflict(game: GameEntry, diagnostics: ExportDiagnostics): void {
  diagnostics.counts.conflicts += 1;
  addWarning(
    diagnostics,
    `${game.name}: contiene puntuacion y recomendacion; ambas se conservan durante la exportacion.`,
  );
}

function notesWith(parts: string[]): string {
  return parts.filter(Boolean).join(" | ");
}

function prepareScoreRow(
  game: GameEntry,
  diagnostics: ExportDiagnostics,
): PreparedRow {
  const parts = [cleanText(game.notes)];
  let score = "";
  const recommendation = game.recommendation;

  if (game.score !== null && isValidScore(game.score)) {
    score = String(game.score);
    if (recommendation !== null) {
      parts.push(`Veredicto: ${cleanText(sourceRecommendation(game))}`);
      markConflict(game, diagnostics);
    }
  } else if (recommendation !== null) {
    score = String(recommendationToScore(recommendation));
    addConversion(diagnostics, "recommendationToScore");
    const canonical = canonicalizeRecommendation(recommendation);
    if (!canonical) {
      diagnostics.counts.unknownRecommendations += 1;
      addWarning(
        diagnostics,
        `${game.name}: la recomendacion desconocida se exporta como 5 y se conserva en los comentarios.`,
      );
    } else {
      addWarning(
        diagnostics,
        `${game.name}: la recomendacion se ha convertido a su punto medio numerico.`,
      );
    }
    parts.push(`Veredicto: ${cleanText(sourceRecommendation(game))}`);
  } else {
    score = String(DEFAULT_NO_RATING_SCORE);
    addConversion(diagnostics, "noRatingFallback");
    addWarning(
      diagnostics,
      `${game.name}: sin puntuacion, se exporta el valor de reserva 5/10.`,
    );
    const rawScore = game.extra[RAW_SCORE_EXTRA_KEY];
    if (rawScore) parts.push(`Puntuacion original: ${cleanText(rawScore)}`);
  }

  if (game.ratingMode === "mixed" && game.score === null && recommendation === null) {
    diagnostics.counts.conflicts += 1;
    addWarning(
      diagnostics,
      `${game.name}: el modo de rating requiere revision y se conserva sin adivinar.`,
    );
  }

  return { score, recommendation: "", notes: notesWith(parts) };
}

function prepareRecommendationRow(
  game: GameEntry,
  diagnostics: ExportDiagnostics,
): PreparedRow {
  const parts = [cleanText(game.notes)];
  let recommendation = "";
  const score = game.score;

  if (game.recommendation !== null) {
    const canonical = canonicalizeRecommendation(game.recommendation);
    recommendation = cleanText(game.recommendation);
    if (!canonical) {
      diagnostics.counts.unknownRecommendations += 1;
      addWarning(
        diagnostics,
        `${game.name}: la recomendacion desconocida se conserva sin corregir.`,
      );
    }
    if (score !== null) {
      parts.push(`Puntuacion: ${cleanText(sourceScore(game))}`);
      markConflict(game, diagnostics);
    }
  } else if (score !== null && isValidScore(score)) {
    recommendation = scoreToRecommendation(score);
    addConversion(diagnostics, "scoreToRecommendation");
    addWarning(
      diagnostics,
      `${game.name}: la puntuacion se ha convertido a un rango de recomendacion.`,
    );
    parts.push(`Puntuacion: ${cleanText(sourceScore(game))}`);
  } else {
    recommendation = DEFAULT_NO_RATING_RECOMMENDATION;
    addConversion(diagnostics, "noRatingFallback");
    addWarning(
      diagnostics,
      `${game.name}: sin rating, se exporta la recomendacion de reserva Recomendado.`,
    );
    const rawScore = game.extra[RAW_SCORE_EXTRA_KEY];
    if (rawScore) parts.push(`Puntuacion original: ${cleanText(rawScore)}`);
  }

  if (game.ratingMode === "mixed" && game.score === null && game.recommendation === null) {
    diagnostics.counts.conflicts += 1;
    addWarning(
      diagnostics,
      `${game.name}: el modo de rating requiere revision y se conserva sin adivinar.`,
    );
  }

  return { score: "", recommendation, notes: notesWith(parts) };
}

function prepareLegacyRow(
  game: GameEntry,
  diagnostics: ExportDiagnostics,
): PreparedRow {
  if (
    game.score !== null ||
    game.recommendation !== null ||
    game.extra[RAW_SCORE_EXTRA_KEY] ||
    game.extra[RAW_RECOMMENDATION_EXTRA_KEY]
  ) {
    diagnostics.counts.omittedRatings += 1;
    addWarning(
      diagnostics,
      `${game.name}: la puntuacion o recomendacion se omite porque legacy-2021 no tiene campos de rating.`,
    );
  }
  return { score: "", recommendation: "", notes: cleanText(game.notes) };
}

function prepareRow(
  game: GameEntry,
  format: ExportFormat,
  diagnostics: ExportDiagnostics,
): PreparedRow {
  if (format === "legacy-2021") return prepareLegacyRow(game, diagnostics);
  if (format === "semicolon-score") return prepareScoreRow(game, diagnostics);
  return prepareRecommendationRow(game, diagnostics);
}

export function serializeGames(
  games: GameEntry[],
  format: ExportFormat,
): {
  content: string;
  warnings: string[];
  warningCount: number;
  counts: ExportCounts;
} {
  const diagnostics: ExportDiagnostics = {
    warnings: [],
    counts: emptyCounts(),
  };
  const rows = games.map((game) => prepareRow(game, format, diagnostics));

  if (format === "legacy-2021") {
    const lines = games.map((game, index) => {
      const row = rows[index];
      const suffix = row.notes ? ` (${row.notes})` : "";
      return `${cleanText(game.name)}\t\t///\t${exportDate(game.date, format)}${suffix}`;
    });
    return {
      content: `${lines.join("\n")}\n`,
      warnings: diagnostics.warnings,
      warningCount: diagnostics.warnings.length,
      counts: diagnostics.counts,
    };
  }

  if (format === "semicolon-score") {
    const lines = [
      "Juego;fechas;nota sobre 10;comentarios adicionales",
      ...games.map((game, index) => {
        const row = rows[index];
        return [game.name, exportDate(game.date, format), row.score, row.notes]
          .map(csvField)
          .join(";");
      }),
    ];
    return {
      content: `${lines.join("\n")}\n`,
      warnings: diagnostics.warnings,
      warningCount: diagnostics.warnings.length,
      counts: diagnostics.counts,
    };
  }

  const lines = [
    "Juego;fechas;Recomendado/No Recomendado + extra;comentarios adicionales",
    ...games.map((game, index) => {
      const row = rows[index];
      return [
        game.name,
        exportDate(game.date, format),
        row.recommendation,
        row.notes,
      ]
        .map(csvField)
        .join(";");
    }),
  ];
  return {
    content: `${lines.join("\n")}\n`,
    warnings: diagnostics.warnings,
    warningCount: diagnostics.warnings.length,
    counts: diagnostics.counts,
  };
}

export function createExportResult(
  filePath: string,
  format: ExportFormat,
  games: GameEntry[],
): ExportResult & { content: string } {
  const serialized = serializeGames(games, format);
  return {
    filePath,
    format,
    rows: games.length,
    warnings: serialized.warnings,
    warningCount: serialized.warningCount,
    counts: serialized.counts,
    content: serialized.content,
  };
}
