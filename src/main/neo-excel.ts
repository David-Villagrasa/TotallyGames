import ExcelJS from "exceljs";
import type { GameEntry, ImportResult } from "../domain/types";
import {
  createNeoImportResult,
  detectNeoColumns,
  type NeoSourceRow,
} from "../domain/neo";

type ExcelColor = {
  argb?: string;
  rgb?: string;
  indexed?: number;
  theme?: number;
};

type ExcelFill = {
  type?: string;
  pattern?: string;
  fgColor?: ExcelColor;
  bgColor?: ExcelColor;
  stops?: Array<{ color?: ExcelColor }>;
};

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  if (typeof value === "object") {
    const candidate = value as { result?: unknown; text?: unknown };
    if (candidate.result !== undefined) return String(candidate.result);
    if (candidate.text !== undefined) return String(candidate.text);
  }
  return String(value);
}

function isWhiteColor(color: ExcelColor): boolean {
  if (color.indexed !== undefined) return color.indexed === 64 || color.indexed === 65;
  const value = (color.argb ?? color.rgb ?? "").toUpperCase();
  if (!value) return false;
  return value.slice(-6) === "FFFFFF" || value === "00FFFFFF";
}

function hasVisibleColor(color: ExcelColor | undefined): boolean {
  return Boolean(color && !isWhiteColor(color));
}

function hasColoredFill(cell: ExcelJS.Cell): boolean {
  const fill = cell.fill as ExcelFill | undefined;
  if (!fill || fill.type === "none" || fill.pattern === "none") return false;
  if (hasVisibleColor(fill.fgColor) || hasVisibleColor(fill.bgColor)) return true;
  return Boolean(fill.stops?.some((stop) => hasVisibleColor(stop.color)));
}

function rowValues(
  row: ExcelJS.Row,
  width: number,
): string[] {
  return Array.from({ length: width }, (_, index) => cellText(row.getCell(index + 1)));
}

function rowRaw(values: string[]): string {
  return values.join("\t");
}

function emptyNeoResult(filePath: string, message: string): ImportResult {
  const result = createNeoImportResult(filePath, [], [], "neo-xlsx", 0);
  result.errors.push({
    line: 0,
    severity: "error",
    code: "read-error",
    message,
  });
  return result;
}

export async function parseNeoWorkbookFile(filePath: string): Promise<ImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return emptyNeoResult(filePath, "El libro de Excel no contiene hojas.");

  const headerRow = worksheet.getRow(1);
  const headerWidth = Math.max(headerRow.cellCount, 5);
  const header = rowValues(headerRow, headerWidth);
  const columns = detectNeoColumns(header);
  if (columns.name === null || columns.date === null) {
    return createNeoImportResult(filePath, header, [], "neo-xlsx", worksheet.rowCount);
  }
  const nameColumn = columns.name;
  const dateColumn = columns.date;

  const rows: NeoSourceRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = rowValues(row, headerWidth);
    if (!values.some((value) => value.trim())) return;
    rows.push({
      line: rowNumber,
      raw: rowRaw(values),
      name: values[nameColumn] ?? "",
      score: columns.score === null ? "" : values[columns.score] ?? "",
      date: values[dateColumn] ?? "",
      completed:
        columns.completed === null ? "" : values[columns.completed] ?? "",
      notes: columns.notes === null ? "" : values[columns.notes] ?? "",
      favorite: hasColoredFill(row.getCell(1)),
      platinum: hasColoredFill(row.getCell(4)),
    });
  });

  return createNeoImportResult(
    filePath,
    header,
    rows,
    "neo-xlsx",
    worksheet.rowCount,
  );
}

function yearValue(game: GameEntry): number | string {
  return game.year ?? (game.date ? Number(game.date.slice(0, 4)) : "");
}

export async function writeNeoWorkbook(
  filePath: string,
  games: GameEntry[],
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Hoja 1");
  worksheet.columns = [
    { header: "Juego", key: "name", width: 34 },
    { header: "Nota", key: "score", width: 12 },
    { header: "Fecha", key: "date", width: 14 },
    { header: "Completado", key: "completed", width: 15 },
    { header: "Comentarios", key: "notes", width: 48 },
  ];

  for (const game of games) {
    const row = worksheet.addRow({
      name: game.name,
      score: game.score ?? "",
      date: yearValue(game),
      completed: game.completed ? "X" : "",
      notes: game.notes,
    });
    if (game.favorite) {
      row.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
    }
    if (game.platinum) {
      row.getCell(4).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0000FF" },
      };
    }
  }

  await workbook.xlsx.writeFile(filePath);
}
