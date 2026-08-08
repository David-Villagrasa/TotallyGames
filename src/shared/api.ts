import type {
  CommitResult,
  ExportFormat,
  ExportResult,
  GameDraft,
  GameCover,
  GameStatusKey,
  ImportBatch,
  LibraryState,
} from "../domain/types";

export type Locale = "es" | "en" | "ja";
export type TableMode = "legacy" | "neo";

export interface AppSettings {
  schemaVersion: 4;
  locale: Locale;
  platformColumnEnabled: boolean;
  theGamesDbApiKey: string;
  tableMode: TableMode;
}

export interface LegacyAppSettings {
  schemaVersion: 1;
  locale: Locale;
}

export interface PreviousAppSettings {
  schemaVersion: 2;
  locale: Locale;
  platformColumnEnabled: boolean;
}

export interface PreviousTheGamesDbAppSettings {
  schemaVersion: 3;
  locale: Locale;
  platformColumnEnabled: boolean;
  theGamesDbApiKey: string;
}

export type AppSettingsInput =
  | AppSettings
  | PreviousTheGamesDbAppSettings
  | PreviousAppSettings
  | LegacyAppSettings;

export const PLATFORM_COLUMN_EXPORT_FORMAT =
  "semicolon-recommendation-platform" as const;

export type ApiExportFormat =
  | ExportFormat
  | typeof PLATFORM_COLUMN_EXPORT_FORMAT;

export interface CoverSearchResult {
  provider: "howlongtobeat" | "thegamesdb";
  sourceId: string;
  title: string;
  imageUrl: string;
  detailUrl: string;
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
    autoCoverImport: boolean,
    reviewRowKeys: string[],
  ): Promise<CommitResult>;
  createGame(draft: GameDraft): Promise<LibraryState>;
  updateGame(id: string, draft: GameDraft): Promise<LibraryState>;
  updateGameStatus(
    id: string,
    status: GameStatusKey,
    value: boolean,
  ): Promise<LibraryState>;
  deleteGames(ids: string[]): Promise<LibraryState>;
  searchCovers(query: string): Promise<CoverSearchResult[]>;
  saveCoverFromSearch(result: CoverSearchResult): Promise<GameCover>;
  readCoverPreview(result: CoverSearchResult): Promise<string | null>;
  clearCoverSearchCache(): Promise<void>;
  selectCoverFile(): Promise<GameCover | null>;
  readCover(key: string): Promise<string | null>;
  exportLibrary(format: ApiExportFormat): Promise<ExportResult | null>;
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettingsInput): Promise<AppSettings>;
  resetApplicationData(): Promise<ResetResult>;
  reportRendererError(report: RendererErrorReport): Promise<void>;
}
