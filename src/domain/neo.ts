import { basename } from "node:path";
import {
  extractYearFromFileName,
  normalizeHeader,
} from "./text";
import {
  isValidScore,
  normalizeScore,
} from "./rating";
import { addReviewReason } from "./review";
import type {
  ExportCounts,
  ExportResult,
  ImportFormat,
  ImportIssue,
  ImportResult,
  ParsedGame,
  PreservedRow,
  ReviewReason,
} from "./types";

export interface NeoSourceRow {
  line: number;
  raw: string;
  name: string;
  score: string;
  date: string;
  completed: string;
  notes: string;
  favorite: boolean;
  platinum: boolean;
  statusRaw?: Partial<Record<"completed" | "favorite" | "platinum", string>>;
}

export interface NeoColumnMap {
  name: number | null;
  score: number | null;
  date: number | null;
  completed: number | null;
  notes: number | null;
  favorite: number | null;
  platinum: number | null;
}

interface ParsedNeoDate {
  value: string | null;
  year: number | null;
}

function issue(
  line: number,
  severity: ImportIssue["severity"],
  code: string,
  message: string,
  raw?: string,
): ImportIssue {
  return { line, severity, code, message, raw };
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

function cleanText(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function csvField(value: string): string {
  const clean = cleanText(value);
  return /[,;"\n]/.test(clean) ? `"${clean.replace(/"/g, '""')}"` : clean;
}

function splitCsv(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  values.push(current.trim());
  return values;
}

function findColumn(headers: string[], candidates: string[]): number | null {
  const normalized = headers.map(normalizeHeader);
  const index = normalized.findIndex((header) =>
    candidates.some((candidate) => header === candidate || header.includes(candidate)),
  );
  return index === -1 ? null : index;
}

export function detectNeoColumns(headers: string[]): NeoColumnMap {
  return {
    name: findColumn(headers, ["juego", "game", "titulo", "title"]),
    score: findColumn(headers, ["nota", "score", "puntuacion"]),
    date: findColumn(headers, ["fecha", "date", "ano", "year"]),
    completed: findColumn(headers, ["completado", "completed", "finished"]),
    notes: findColumn(headers, ["comentarios", "comments", "notas", "notes"]),
    favorite: findColumn(headers, ["favorito", "favorite", "favourite"]),
    platinum: findColumn(headers, ["platinado", "platinum"]),
  };
}

function parseMarker(
  value: string,
): { value: boolean; recognized: boolean } {
  const normalized = normalizeHeader(value);
  if (!normalized) return { value: false, recognized: true };
  if (["x", "si", "sí", "yes", "true", "1", "check"].includes(normalized)) {
    return { value: true, recognized: true };
  }
  if (["no", "false", "0", "n"].includes(normalized)) {
    return { value: false, recognized: true };
  }
  return { value: false, recognized: false };
}

function parseDate(value: string): ParsedNeoDate {
  const trimmed = value.trim();
  if (!trimmed) return { value: null, year: null };

  const yearOnly = trimmed.match(/^(\d{4})$/);
  if (yearOnly) {
    const year = Number(yearOnly[1]);
    return { value: `${year}-01-01`, year };
  }

  const match = trimmed.match(/^(\d{4})[-/]([0-9]{1,2})(?:[-/]([0-9]{1,2}))?/);
  if (!match) return { value: null, year: null };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3] ?? 1);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return { value: null, year: null };
  }
  return {
    value: `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`,
    year,
  };
}

function createResult(
  filePath: string,
  header: string[],
  totalLines: number,
  format: ImportFormat,
): ImportResult {
  return {
    filePath,
    fileName: basename(filePath),
    format,
    year: extractYearFromFileName(basename(filePath)),
    yearSource:
      extractYearFromFileName(basename(filePath)) === null
        ? "unknown"
        : "filename",
    totalLines,
    header,
    rows: [],
    preservedRows: [],
    warnings: [],
    errors: [],
  };
}

function addPreserved(result: ImportResult, row: PreservedRow): void {
  result.preservedRows.push(row);
}

function addStatusReview(
  result: ImportResult,
  reasons: ReviewReason[],
  extra: Record<string, string>,
  row: NeoSourceRow,
): void {
  for (const [status, raw] of Object.entries(row.statusRaw ?? {})) {
    if (!raw) continue;
    addReviewReason(reasons, "unknown-status");
    extra[`neo-status-${status}`] = raw;
    result.warnings.push(
      issue(
        row.line,
        "warning",
        "unknown-status",
        `Estado no reconocido en ${status}: "${raw}".`,
        row.raw,
      ),
    );
  }
}

function populateYear(result: ImportResult): void {
  const contentYears = new Set(
    result.rows
      .map((row) => row.year)
      .filter((year): year is number => year !== null),
  );
  result.years = [...contentYears].sort((left, right) => right - left);
  if (result.year !== null) {
    for (const row of result.rows) {
      if (row.year !== null && row.year !== result.year) {
        const reasons = row.reviewReasons ? [...row.reviewReasons] : [];
        addReviewReason(reasons, "year-conflict");
        row.reviewReasons = reasons;
        row.needsReview = true;
        result.warnings.push(
          issue(
            row.source.line,
            "warning",
            "year-conflict",
            `La fecha indica ${row.year}, pero el nombre del fichero indica ${result.year}.`,
            row.source.raw,
          ),
        );
      }
    }
    return;
  }
  if (contentYears.size === 1) {
    result.year = [...contentYears][0];
    result.yearSource = "content";
    return;
  }
  if (contentYears.size > 1) {
    if (result.format === "neo-xlsx" || result.format === "neo-csv") {
      result.yearSource = "content";
      return;
    }
    result.warnings.push(
      issue(
        0,
        "warning",
        "ambiguous-year",
        "No se puede asociar un único año al contenido del fichero.",
      ),
    );
    result.rows.forEach((row) => {
      const reasons = row.reviewReasons ? [...row.reviewReasons] : [];
      addReviewReason(reasons, "ambiguous-year");
      row.reviewReasons = reasons;
      row.needsReview = true;
    });
  }
}

export function createNeoImportResult(
  filePath: string,
  header: string[],
  sourceRows: NeoSourceRow[],
  format: "neo-xlsx" | "neo-csv",
  totalLines = sourceRows.length + 1,
): ImportResult {
  const result = createResult(filePath, header, totalLines, format);
  const columns = detectNeoColumns(header);
  if (columns.name === null || columns.date === null) {
    result.errors.push(
      issue(
        1,
        "error",
        "missing-required-field",
        "El formato Neo necesita columnas de juego y fecha.",
        header.join(" | "),
      ),
    );
    sourceRows.forEach((row) =>
      addPreserved(result, {
        line: row.line,
        kind: "rejected",
        raw: row.raw,
        reason: "Faltan las columnas requeridas del formato Neo.",
      }),
    );
    return result;
  }

  for (const sourceRow of sourceRows) {
    const name = sourceRow.name.trim();
    if (!name) {
      result.errors.push(
        issue(
          sourceRow.line,
          "error",
          "missing-name",
          "La fila no tiene nombre de juego.",
          sourceRow.raw,
        ),
      );
      addPreserved(result, {
        line: sourceRow.line,
        kind: "rejected",
        raw: sourceRow.raw,
        reason: "Nombre vacío.",
      });
      continue;
    }

    const reviewReasons: ReviewReason[] = [];
    const extra: Record<string, string> = {};
    const parsedDate = parseDate(sourceRow.date);
    if (!parsedDate.value) {
      addReviewReason(reviewReasons, sourceRow.date.trim() ? "invalid-date" : "missing-date");
      result.errors.push(
        issue(
          sourceRow.line,
          "error",
          sourceRow.date.trim() ? "invalid-date" : "missing-date",
          sourceRow.date.trim()
            ? `Fecha no válida: "${sourceRow.date}".`
            : "Falta la fecha del juego.",
          sourceRow.raw,
        ),
      );
      if (sourceRow.date.trim()) extra["raw-date"] = sourceRow.date.trim();
    }

    let score: number | null = null;
    const rawScore = sourceRow.score.trim();
    if (rawScore) {
      const parsedScore = Number(rawScore.replace(",", "."));
      if (!isValidScore(parsedScore)) {
        addReviewReason(reviewReasons, "invalid-score");
        extra["raw-score"] = rawScore;
        result.errors.push(
          issue(
            sourceRow.line,
            "error",
            "invalid-score",
            `Puntuación no válida: "${rawScore}".`,
            sourceRow.raw,
          ),
        );
      } else {
        score = normalizeScore(parsedScore);
      }
    }

    const completedMarker = parseMarker(sourceRow.completed);
    const statusRaw = {
      ...(sourceRow.statusRaw ?? {}),
      ...(sourceRow.completed.trim() && !completedMarker.recognized
        ? { completed: sourceRow.completed.trim() }
        : {}),
    };
    addStatusReview(result, reviewReasons, extra, {
      ...sourceRow,
      statusRaw,
    });
    result.rows.push({
      name,
      year: parsedDate.year,
      date: parsedDate.value ?? "",
      score,
      recommendation: null,
      platform: null,
      cover: null,
      notes: sourceRow.notes.trim(),
      extra,
      source: {
        filePath: result.filePath,
        line: sourceRow.line,
        format,
        raw: sourceRow.raw,
      },
      ratingMode: score === null ? "legacy-2021" : "semicolon-score",
      completed: completedMarker.value,
      platinum: sourceRow.platinum,
      favorite: sourceRow.favorite,
      needsReview: reviewReasons.length > 0,
      ...(reviewReasons.length ? { reviewReasons } : {}),
    });
  }

  populateYear(result);
  return result;
}

function sourceRowsFromCsv(
  lines: string[],
  headerIndex: number,
  map: NeoColumnMap,
): NeoSourceRow[] {
  return lines.slice(headerIndex + 1).flatMap((raw, offset) => {
    if (!raw.trim()) return [];
    const values = splitCsv(raw);
    const marker = (column: number | null): { value: boolean; raw?: string } => {
      if (column === null) return { value: false };
      const value = values[column]?.trim() ?? "";
      const parsed = parseMarker(value);
      return parsed.recognized ? { value: parsed.value } : { value: false, raw: value };
    };
    const completed = marker(map.completed);
    const favorite = marker(map.favorite);
    const platinum = marker(map.platinum);
    return [
      {
        line: headerIndex + offset + 2,
        raw,
        name: values[map.name ?? -1] ?? "",
        score: values[map.score ?? -1] ?? "",
        date: values[map.date ?? -1] ?? "",
        completed: values[map.completed ?? -1] ?? "",
        notes: values[map.notes ?? -1] ?? "",
        favorite: favorite.value,
        platinum: platinum.value,
        statusRaw: {
          ...(completed.raw ? { completed: completed.raw } : {}),
          ...(favorite.raw ? { favorite: favorite.raw } : {}),
          ...(platinum.raw ? { platinum: platinum.raw } : {}),
        },
      },
    ];
  });
}

export function parseNeoCsvFile(filePath: string, content: string): ImportResult {
  const lines = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const headerIndex = lines.findIndex((line) => line.trim().length > 0);
  if (headerIndex === -1) {
    const result = createResult(filePath, [], lines.length, "neo-csv");
    result.errors.push(issue(1, "error", "unknown-format", "El CSV Neo está vacío."));
    return result;
  }
  const header = splitCsv(lines[headerIndex]);
  const map = detectNeoColumns(header);
  return createNeoImportResult(
    filePath,
    header,
    sourceRowsFromCsv(lines, headerIndex, map),
    "neo-csv",
    lines.length,
  );
}

export function createNeoCsvExportResult(
  filePath: string,
  games: ParsedGame[],
): ExportResult & { content: string } {
  const lines = [
    "Juego,Nota,Fecha,Completado,Comentarios,Platinado,Favorito",
    ...games.map((game) =>
      [
        game.name,
        game.score === null ? "" : String(game.score),
        game.year === null ? "" : String(game.year),
        game.completed ? "X" : "",
        game.notes,
        game.platinum ? "X" : "",
        game.favorite ? "X" : "",
      ]
        .map(csvField)
        .join(","),
    ),
  ];
  return {
    filePath,
    format: "neo-csv",
    rows: games.length,
    warnings: [],
    warningCount: 0,
    counts: emptyCounts(),
    content: `${lines.join("\n")}\n`,
  };
}
