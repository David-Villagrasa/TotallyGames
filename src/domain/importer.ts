import { basename } from "node:path";
import type {
  ImportFormat,
  ImportIssue,
  ImportResult,
  Platform,
  ParsedGame,
  PreservedRow,
  ReviewReason,
} from "./types";
import {
  extractYearFromFileName,
  normalizeHeader,
  splitSemicolon,
} from "./text";
import {
  canonicalizeRecommendation,
  RAW_RECOMMENDATION_EXTRA_KEY,
  RAW_SCORE_EXTRA_KEY,
  RATING_CONFLICT_EXTRA_KEY,
  isValidScore,
  normalizeScore,
} from "./rating";
import {
  canonicalizePlatform,
  RAW_PLATFORM_EXTRA_KEY,
} from "./platform";
import {
  addReviewReason,
  RAW_DATE_EXTRA_KEY,
  reviewReasonFromCode,
} from "./review";

interface ParsedDate {
  value: string | null;
  issue?: ImportIssue;
}

interface ColumnMap {
  name: number;
  date: number;
  score: number | null;
  recommendation: number | null;
  platform: number | null;
  notes: number | null;
}

const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;

function issue(
  line: number,
  severity: ImportIssue["severity"],
  code: string,
  message: string,
  raw?: string,
): ImportIssue {
  return { line, severity, code, message, raw };
}

function parseDate(
  value: string,
  fileYear: number | null,
  line: number,
  raw: string,
): ParsedDate {
  if (!value.trim()) {
    return {
      value: null,
      issue: issue(
        line,
        "error",
        "missing-date",
        "Falta la fecha del juego.",
        raw,
      ),
    };
  }
  const match = value.trim().match(DATE_PATTERN);
  if (!match) {
    return {
      value: null,
      issue: issue(
        line,
        "error",
        "invalid-date",
        `Fecha no válida: "${value}".`,
        raw,
      ),
    };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const sourceYear = Number(match[3]);
  const year = match[3].length === 2 ? fileYear : sourceYear;

  if (!year) {
    return {
      value: null,
      issue: issue(
        line,
        "error",
        "missing-year",
        "No se puede interpretar un año de dos dígitos sin año de fichero.",
        raw,
      ),
    };
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return {
      value: null,
      issue: issue(
        line,
        "error",
        "invalid-date",
        `Fecha no válida: "${value}".`,
        raw,
      ),
    };
  }

  const yearConflict =
    match[3].length === 4 && fileYear !== null && sourceYear !== fileYear;
  return {
    value: `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
    issue: yearConflict
      ? issue(
          line,
          "warning",
          "year-conflict",
          `La fecha indica ${sourceYear}, pero el nombre del fichero indica ${fileYear}.`,
          raw,
        )
      : undefined,
  };
}

function addDateIssue(result: ImportResult, parsed: ParsedDate): void {
  if (parsed.issue) {
    if (parsed.issue.severity === "error") result.errors.push(parsed.issue);
    else result.warnings.push(parsed.issue);
  }
}

function addReviewIssue(reasons: ReviewReason[], parsed: ParsedDate): void {
  const reason = parsed.issue ? reviewReasonFromCode(parsed.issue.code) : null;
  if (reason) addReviewReason(reasons, reason);
}

function findColumn(headers: string[], candidates: string[]): number | null {
  const index = headers.findIndex((header) =>
    candidates.some((candidate) => header.includes(candidate)),
  );
  return index === -1 ? null : index;
}

function preserveRawExtra(
  extra: Record<string, string>,
  key: string,
  value: string,
): void {
  if (!(key in extra) || extra[key] === value) {
    extra[key] = value;
  } else {
    extra[`${key}-import`] = value;
  }
}

function detectSemicolonFormat(
  header: string[],
): { format: ImportFormat; map: ColumnMap } | null {
  const normalized = header.map(normalizeHeader);
  const name = findColumn(normalized, ["juego", "game", "titulo", "title"]);
  const date = findColumn(normalized, ["fecha", "fechas", "date"]);
  const score = findColumn(normalized, [
    "nota sobre 10",
    "score out of 10",
    "score",
    "nota",
  ]);
  const recommendation = findColumn(normalized, [
    "recomendado",
    "recommendation",
  ]);
  const notes = findColumn(normalized, [
    "comentarios",
    "comments",
    "adicional",
    "comment",
  ]);
  const platform = findColumn(normalized, [
    "plataforma",
    "platform",
    "consola",
    "console",
  ]);

  if (name === null || date === null || notes === null) return null;
  if (score !== null && recommendation !== null) {
    return {
      format: "semicolon-mixed",
      map: { name, date, score, recommendation, platform: null, notes },
    };
  }
  if (recommendation !== null && platform !== null) {
    return {
      format: "semicolon-recommendation-platform",
      map: { name, date, score: null, recommendation, platform, notes },
    };
  }
  if (recommendation !== null) {
    return {
      format: "semicolon-recommendation",
      map: {
        name,
        date,
        score: null,
        recommendation,
        platform: null,
        notes,
      },
    };
  }
  if (score !== null) {
    return {
      format: "semicolon-score",
      map: { name, date, score, recommendation: null, platform: null, notes },
    };
  }
  return null;
}

function createResult(
  filePath: string,
  lines: string[],
  format: ImportFormat,
  year: number | null,
): ImportResult {
  return {
    filePath,
    fileName: basename(filePath),
    format,
    year,
    yearSource: year === null ? "unknown" : "filename",
    totalLines: lines.length,
    header: [],
    rows: [],
    preservedRows: [],
    warnings: [],
    errors: [],
  };
}

function addPreserved(result: ImportResult, preserved: PreservedRow): void {
  result.preservedRows.push(preserved);
}

function parseLegacy(lines: string[], result: ImportResult): void {
  const legacyPattern =
    /^\s*(.*?)\s*\/\/\/\s*(.*?)\s*(?:\((.*?)\))?\s*$/;

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const match = raw.match(legacyPattern);
    if (!match) {
      const looksLikeGame = raw.includes("///");
      addPreserved(result, {
        line,
        kind: looksLikeGame ? "rejected" : "metadata",
        raw,
        reason: looksLikeGame
          ? "La fila contiene el separador histórico, pero no una fecha válida."
          : "Línea de resumen o metadato conservada sin convertirla en juego.",
      });
      if (looksLikeGame) {
        result.errors.push(
          issue(
            line,
            "error",
            "unparsed-legacy-row",
            "No se pudo interpretar la fila histórica.",
            raw,
          ),
        );
      }
      return;
    }

    const name = match[1].trim();
    if (!name) {
      result.errors.push(
        issue(
          line,
          "error",
          "missing-name",
          "La fila no tiene nombre de juego.",
          raw,
        ),
      );
      addPreserved(result, {
        line,
        kind: "rejected",
        raw,
        reason: "Nombre vacio.",
      });
      return;
    }

    const reviewReasons: ReviewReason[] = [];
    const date = parseDate(match[2], result.year, line, raw);
    addDateIssue(result, date);
    addReviewIssue(reviewReasons, date);
    const extra: Record<string, string> = {};
    if (!date.value && match[2].trim()) {
      extra[RAW_DATE_EXTRA_KEY] = match[2].trim();
    }

    result.rows.push({
      name,
      year: result.year,
      date: date.value ?? "",
      score: null,
      recommendation: null,
      platform: null,
      cover: null,
      notes: match[3]?.trim() ?? "",
      extra,
      source: { filePath: result.filePath, line, format: result.format, raw },
      ratingMode: "legacy-2021",
      completed: false,
      platinum: false,
      favorite: false,
      needsReview: reviewReasons.length > 0,
      ...(reviewReasons.length ? { reviewReasons } : {}),
    });
  });
}

function parseSemicolon(
  lines: string[],
  result: ImportResult,
  map: ColumnMap,
): void {
  const headerIndex = lines.findIndex((line) => line.trim().length > 0);
  if (headerIndex === -1) return;
  result.header = splitSemicolon(lines[headerIndex]);

  lines.slice(headerIndex + 1).forEach((raw, offset) => {
    const line = headerIndex + offset + 2;
    if (!raw.trim()) return;

    const values = splitSemicolon(raw);
    const first = values[0]?.trim().toUpperCase();
    if (first === "TOP5" || first?.startsWith("TOP 5")) {
      addPreserved(result, {
        line,
        kind: "metadata",
        raw,
        reason: "Fila de resumen TOP5 conservada como metadato.",
      });
      result.warnings.push(
        issue(
          line,
          "info",
          "summary-row",
          "Fila de resumen conservada, no importada como juego.",
          raw,
        ),
      );
      return;
    }

    const name = values[map.name]?.trim() ?? "";
    const dateValue = values[map.date]?.trim() ?? "";
    if (!name) {
      result.errors.push(
        issue(
          line,
          "error",
          "missing-name",
          "La fila no tiene nombre de juego.",
          raw,
        ),
      );
      addPreserved(result, {
        line,
        kind: "rejected",
        raw,
        reason: "Nombre vacio.",
      });
      return;
    }

    const reviewReasons: ReviewReason[] = [];
    const date = parseDate(dateValue, result.year, line, raw);
    addDateIssue(result, date);
    addReviewIssue(reviewReasons, date);

    const extra: Record<string, string> = {};
    if (!date.value && dateValue) extra[RAW_DATE_EXTRA_KEY] = dateValue;

    let score: number | null = null;
    let rawScore: string | undefined;
    if (map.score !== null) {
      const scoreValue = values[map.score]?.trim() ?? "";
      if (scoreValue) {
        const parsedScore = Number(scoreValue.replace(",", "."));
        if (!isValidScore(parsedScore)) {
          result.errors.push(
            issue(
              line,
              "error",
              "invalid-score",
              `Puntuación no válida: "${scoreValue}".`,
              raw,
            ),
          );
          addReviewReason(reviewReasons, "invalid-score");
          extra[RAW_SCORE_EXTRA_KEY] = scoreValue;
        } else {
          score = normalizeScore(parsedScore);
          rawScore = scoreValue;
        }
      }
    }

    const mappedColumns = new Set(
      [
        map.name,
        map.date,
        map.score,
        map.recommendation,
        map.platform,
        map.notes,
      ].filter((index): index is number => index !== null),
    );
    result.header.forEach((header, index) => {
      if (!mappedColumns.has(index))
        extra[`column-${header || index + 1}`] = values[index] ?? "";
    });
    values.forEach((value, index) => {
      if (index >= result.header.length) extra[`column-${index + 1}`] = value;
    });

    const rawRecommendation =
      map.recommendation === null
        ? ""
        : (values[map.recommendation]?.trim() ?? "");
    let recommendation: string | null = rawRecommendation || null;
    if (result.format === "semicolon-mixed") {
      addReviewReason(reviewReasons, "mixed-rating-fields");
    }
    if (rawRecommendation) {
      const canonical = canonicalizeRecommendation(rawRecommendation);
      if (canonical) {
        recommendation = canonical;
        extra[RAW_RECOMMENDATION_EXTRA_KEY] = rawRecommendation;
      } else {
        addReviewReason(reviewReasons, "unknown-recommendation");
        result.warnings.push(
          issue(
            line,
            "warning",
            "unknown-recommendation",
            `Recomendación no reconocida, conservada sin corregir: "${rawRecommendation}".`,
            raw,
          ),
        );
        extra[RAW_RECOMMENDATION_EXTRA_KEY] = rawRecommendation;
      }
    }
    if (rawScore) extra[RAW_SCORE_EXTRA_KEY] = rawScore;

    const rawPlatform =
      map.platform === null ? "" : (values[map.platform]?.trim() ?? "");
    let platform: Platform | null = null;
    if (rawPlatform) {
      const canonical = canonicalizePlatform(rawPlatform);
      if (canonical) {
        platform = canonical;
        if (canonical !== rawPlatform) {
          preserveRawExtra(extra, RAW_PLATFORM_EXTRA_KEY, rawPlatform);
        }
      } else {
        addReviewReason(reviewReasons, "unknown-platform");
        preserveRawExtra(extra, RAW_PLATFORM_EXTRA_KEY, rawPlatform);
        result.warnings.push(
          issue(
            line,
            "warning",
            "unknown-platform",
            `Plataforma no reconocida, conservada sin corregir: "${rawPlatform}".`,
            raw,
          ),
        );
      }
    }

    const ratingMode =
      result.format === "semicolon-mixed"
        ? "mixed"
        : result.format === "semicolon-score"
          ? "semicolon-score"
          : "semicolon-recommendation";
    const ratingConflict =
      score !== null && recommendation !== null
        ? {
            score,
            recommendation,
            rawScore,
            rawRecommendation: rawRecommendation || undefined,
          }
        : undefined;
    if (ratingConflict) {
      addReviewReason(reviewReasons, "mixed-rating-fields");
      extra[RATING_CONFLICT_EXTRA_KEY] = "score-and-recommendation";
      result.warnings.push(
        issue(
          line,
          "warning",
          "mixed-rating-fields",
          "La fila contiene puntuación y recomendación; ambas se conservan para revisión.",
          raw,
        ),
      );
    }

    result.rows.push({
      name,
      year: result.year,
      date: date.value ?? "",
      score,
      recommendation,
      platform,
      cover: null,
      notes: map.notes === null ? "" : (values[map.notes]?.trim() ?? ""),
      extra,
      source: { filePath: result.filePath, line, format: result.format, raw },
      ratingMode,
      completed: false,
      platinum: false,
      favorite: false,
      needsReview: reviewReasons.length > 0,
      ...(reviewReasons.length ? { reviewReasons } : {}),
      ...(ratingConflict ? { ratingConflict } : {}),
    });
  });
}

function inferYearFromContent(result: ImportResult): void {
  if (result.year !== null || result.rows.length === 0) return;
  const contentYears = new Set(
    result.rows
      .map((row) => Number(row.date.slice(0, 4)))
      .filter((year) => Number.isInteger(year) && year > 0),
  );
  if (contentYears.size === 1) {
    result.year = [...contentYears][0];
    result.yearSource = "content";
    result.rows.forEach((row) => {
      row.year = result.year;
    });
  } else {
    result.rows.forEach((row) => {
      row.needsReview = true;
      const reviewReasons = row.reviewReasons ? [...row.reviewReasons] : [];
      addReviewReason(reviewReasons, "ambiguous-year");
      row.reviewReasons = reviewReasons;
    });
    result.warnings.push(
      issue(
        0,
        "warning",
        "ambiguous-year",
      "No se puede asociar un único año al contenido del fichero.",
      ),
    );
  }
}

export function parseTextFile(filePath: string, content: string): ImportResult {
  const normalizedContent = content
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  const lines = normalizedContent.split("\n");
  const year = extractYearFromFileName(basename(filePath));
  const nonEmpty = lines.filter((line) => line.trim().length > 0);
  const firstSemicolon = nonEmpty.find((line) => line.includes(";"));
  const semicolonDetection = firstSemicolon
    ? detectSemicolonFormat(splitSemicolon(firstSemicolon))
    : null;
  const hasLegacyRows = nonEmpty.some((line) => line.includes("///"));

  if (semicolonDetection) {
    const result = createResult(
      filePath,
      lines,
      semicolonDetection.format,
      year,
    );
    parseSemicolon(lines, result, semicolonDetection.map);
    inferYearFromContent(result);
    return result;
  }

  if (hasLegacyRows) {
    const result = createResult(filePath, lines, "legacy-2021", year);
    parseLegacy(lines, result);
    inferYearFromContent(result);
    return result;
  }

  const result = createResult(filePath, lines, "unknown", year);
  nonEmpty.forEach((raw, index) => {
    const line = lines.indexOf(raw) + 1 || index + 1;
    addPreserved(result, {
      line,
      kind: "unparsed",
      raw,
      reason: "Formato no reconocido.",
    });
  });
  result.errors.push(
    issue(
      1,
      "error",
      "unknown-format",
      "No se reconoce el formato del fichero.",
      nonEmpty[0],
    ),
  );
  return result;
}

export function createReadErrorResult(
  filePath: string,
  message: string,
): ImportResult {
  const result = createResult(
    filePath,
    [],
    "unknown",
    extractYearFromFileName(basename(filePath)),
  );
  result.errors.push(issue(0, "error", "read-error", message));
  return result;
}
