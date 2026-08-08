import type {
  ApiExportFormat,
  AppSettings,
} from "../shared/api";
import { PLATFORM_COLUMN_EXPORT_FORMAT } from "../shared/api";

export function isExportFormat(value: unknown): value is ApiExportFormat {
  return (
    value === "legacy-2021" ||
    value === "semicolon-score" ||
    value === "semicolon-recommendation" ||
    value === PLATFORM_COLUMN_EXPORT_FORMAT ||
    value === "neo-csv" ||
    value === "neo-xlsx"
  );
}

export function assertExportAllowed(
  format: ApiExportFormat,
  settings: AppSettings,
): void {
  if (
    format === PLATFORM_COLUMN_EXPORT_FORMAT &&
    !settings.platformColumnEnabled
  ) {
    throw new Error(
      "La exportación con columna de plataforma está desactivada en los ajustes.",
    );
  }
  if (
    (format === "neo-csv" || format === "neo-xlsx") &&
    settings.tableMode !== "neo"
  ) {
    throw new Error("La exportación Neo requiere activar la tabla Neo en los ajustes.");
  }
}
