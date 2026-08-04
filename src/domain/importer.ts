import { basename } from "node:path";
import type {
  ImportFormat,
  ImportIssue,
  ImportResult,
  ParsedGame,
  PreservedRow,
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
} from "./rating";

interface ParsedDate {
  value: string | null;
  issue?: ImportIssue;
}

interface ColumnMap {
  name: number;
  date: number;
  score: number | null;
  recommendation: number | null;
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
  const match = value.trim().match(DATE_PATTERN);
  if (!match) {
    return {
      value: null,
      issue: issue(
        line,
        "error",
        "invalid-date",
        `Fecha no valida: "${value}".`,
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
        "No se puede interpretar un anio de dos digitos sin anio de fichero.",
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
        `Fecha no valida: "${value}".`,
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

function findColumn(headers: string[], candidates: string[]): number | null {
  const index = headers.findIndex((header) =>
    candidates.some((candidate) => header.includes(candidate)),
  );
  return index === -1 ? null : index;
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

  if (name === null || date === null || notes === null) return null;
  if (score !== null && recommendation !== null) {
    return {
      format: "semicolon-mixed",
      map: { name, date, score, recommendation, notes },
    };
  }
  if (recommendation !== null) {
    return {
      format: "semicolon-recommendation",
      map: { name, date, score: null, recommendation, notes },
    };
  }
  if (score !== null) {
    return {
      format: "semicolon-score",
      map: { name, date, score, recommendation: null, notes },
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
    /^\s*(.*?)\s*\/\/\/\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:\((.*?)\))?\s*$/;

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
          ? "La fila contiene el separador historico, pero no una fecha valida."
          : "Linea de resumen o metadato conservada sin convertirla en juego.",
      });
      if (looksLikeGame) {
        result.errors.push(
          issue(
            line,
            "error",
            "unparsed-legacy-row",
            "No se pudo interpretar la fila historica.",
            raw,
          ),
        );
      }
      return;
    }

    const date = parseDate(match[2], result.year, line, raw);
    addDateIssue(result, date);
    if (!date.value) {
      addPreserved(result, {
        line,
        kind: "rejected",
        raw,
        reason: "Fecha invalida.",
      });
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

    result.rows.push({
      name,
      year: result.year,
      date: date.value,
      score: null,
      recommendation: null,
      notes: match[3]?.trim() ?? "",
      extra: {},
      source: { filePath: result.filePath, line, format: result.format, raw },
      ratingMode: "legacy-2021",
      needsReview: false,
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
    if (!name || !dateValue) {
      result.errors.push(
        issue(
          line,
          "error",
          "missing-required-field",
          "Falta el nombre o la fecha del juego.",
          raw,
        ),
      );
      addPreserved(result, {
        line,
        kind: "rejected",
        raw,
        reason: "Falta nombre o fecha.",
      });
      return;
    }

    const date = parseDate(dateValue, result.year, line, raw);
    addDateIssue(result, date);
    if (!date.value) {
      addPreserved(result, {
        line,
        kind: "rejected",
        raw,
        reason: "Fecha invalida.",
      });
      return;
    }

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
              `Puntuacion no valida: "${scoreValue}".`,
              raw,
            ),
          );
          addPreserved(result, {
            line,
            kind: "rejected",
            raw,
            reason: "Puntuacion fuera de 0 a 10.",
          });
          return;
        }
        score = parsedScore;
        rawScore = scoreValue;
      }
    }

    const extra: Record<string, string> = {};
    const mappedColumns = new Set(
      [map.name, map.date, map.score, map.recommendation, map.notes].filter(
        (index): index is number => index !== null,
      ),
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
    let needsReview = result.format === "semicolon-mixed";
    if (rawRecommendation) {
      const canonical = canonicalizeRecommendation(rawRecommendation);
      if (canonical) {
        recommendation = canonical;
        extra[RAW_RECOMMENDATION_EXTRA_KEY] = rawRecommendation;
      } else {
        needsReview = true;
        result.warnings.push(
          issue(
            line,
            "warning",
            "unknown-recommendation",
            `Recomendacion no reconocida, conservada sin corregir: "${rawRecommendation}".`,
            raw,
          ),
        );
        extra[RAW_RECOMMENDATION_EXTRA_KEY] = rawRecommendation;
      }
    }
    if (rawScore) extra[RAW_SCORE_EXTRA_KEY] = rawScore;

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
      needsReview = true;
      extra[RATING_CONFLICT_EXTRA_KEY] = "score-and-recommendation";
      result.warnings.push(
        issue(
          line,
          "warning",
          "mixed-rating-fields",
          "La fila contiene puntuacion y recomendacion; ambas se conservan para revision.",
          raw,
        ),
      );
    }

    result.rows.push({
      name,
      year: result.year,
      date: date.value,
      score,
      recommendation,
      notes: map.notes === null ? "" : (values[map.notes]?.trim() ?? ""),
      extra,
      source: { filePath: result.filePath, line, format: result.format, raw },
      ratingMode,
      needsReview,
      ...(ratingConflict ? { ratingConflict } : {}),
    });
  });
}

function inferYearFromContent(result: ImportResult): void {
  if (result.year !== null || result.rows.length === 0) return;
  const contentYears = new Set(
    result.rows.map((row) => Number(row.date.slice(0, 4))),
  );
  if (contentYears.size === 1) {
    result.year = [...contentYears][0];
    result.yearSource = "content";
    result.rows.forEach((row) => {
      row.year = result.year;
    });
  } else {
    result.warnings.push(
      issue(
        0,
        "warning",
        "ambiguous-year",
        "No se puede asociar un unico anio al contenido del fichero.",
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
