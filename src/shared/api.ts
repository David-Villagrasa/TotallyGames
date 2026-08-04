import type {
  CommitResult,
  ExportFormat,
  ExportResult,
  GameDraft,
  ImportBatch,
  LibraryState,
} from "../domain/types";

export type Locale = "es" | "en" | "ja";

export interface AppSettings {
  schemaVersion: 1;
  locale: Locale;
}

export interface RendererErrorReport {
  operation: string;
  message: string;
  stack?: string;
}

export interface ResetResult {
  libraryReset: boolean;
  settings: AppSettings;
}

export interface DgtApi {
  loadState(): Promise<LibraryState>;
  selectImportFiles(): Promise<ImportBatch | null>;
  selectImportFolder(): Promise<ImportBatch | null>;
  commitImport(
    batchId: string,
    allowDuplicates: boolean,
  ): Promise<CommitResult>;
  createGame(draft: GameDraft): Promise<LibraryState>;
  updateGame(id: string, draft: GameDraft): Promise<LibraryState>;
  deleteGames(ids: string[]): Promise<LibraryState>;
  exportLibrary(format: ExportFormat): Promise<ExportResult | null>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  resetApplicationData(): Promise<ResetResult>;
  reportRendererError(report: RendererErrorReport): Promise<void>;
}
