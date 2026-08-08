import type { Platform } from "./platform";
import type { GameCover } from "./cover";

export type { Platform } from "./platform";
export type { CoverProvider, GameCover } from "./cover";

export type CanonicalRatingMode =
  | "legacy-2021"
  | "semicolon-score"
  | "semicolon-recommendation";

export type RatingMode = CanonicalRatingMode | "mixed";

export type ImportFormat =
  | CanonicalRatingMode
  | "semicolon-mixed"
  | "semicolon-recommendation-platform"
  | "neo-xlsx"
  | "neo-csv"
  | "unknown";

export type HistoricalExportFormat =
  | CanonicalRatingMode
  | "semicolon-recommendation-platform";

export type NeoExportFormat = "neo-xlsx" | "neo-csv";

export type ExportFormat = HistoricalExportFormat | NeoExportFormat;

export type CanonicalRecommendation =
  | "No Recomendado"
  | "Poco Recomendado"
  | "Recomendado"
  | "Muy Recomendado";

export type IssueSeverity = "info" | "warning" | "error";

export type GameStatusKey = "completed" | "platinum" | "favorite";

export type ReviewReason =
  | "missing-date"
  | "invalid-date"
  | "missing-year"
  | "year-conflict"
  | "invalid-score"
  | "unknown-recommendation"
  | "unknown-platform"
  | "mixed-rating-fields"
  | "ambiguous-year"
  | "unknown-status";

export interface ImportIssue {
  line: number;
  severity: IssueSeverity;
  code: string;
  message: string;
  raw?: string;
}

export interface PreservedRow {
  line: number;
  kind: "metadata" | "unparsed" | "rejected";
  raw: string;
  reason: string;
}

export interface SourceRef {
  filePath: string;
  line: number;
  format: ImportFormat;
  raw: string;
}

export interface RatingConflict {
  score: number | null;
  recommendation: string | null;
  rawScore?: string;
  rawRecommendation?: string;
}

export interface ParsedGame {
  name: string;
  year: number | null;
  date: string;
  score: number | null;
  recommendation: string | null;
  platform: Platform | null;
  cover: GameCover | null;
  notes: string;
  extra: Record<string, string>;
  source: SourceRef;
  ratingMode: RatingMode;
  completed: boolean;
  platinum: boolean;
  favorite: boolean;
  needsReview: boolean;
  reviewReasons?: ReviewReason[];
  ratingConflict?: RatingConflict;
}

export type ImportCoverResolver = (
  parsed: ParsedGame,
) => Promise<GameCover | null>;

export interface GameEntry extends ParsedGame {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  filePath: string;
  fileName: string;
  format: ImportFormat;
  year: number | null;
  yearSource: "filename" | "content" | "unknown";
  years?: number[];
  totalLines: number;
  header: string[];
  rows: ParsedGame[];
  preservedRows: PreservedRow[];
  warnings: ImportIssue[];
  errors: ImportIssue[];
}

export interface ImportBatch {
  id: string;
  createdAt: string;
  files: ImportResult[];
}

export interface ImportAudit {
  id: string;
  createdAt: string;
  filePath: string;
  fileName: string;
  format: ImportFormat;
  year: number | null;
  years?: number[];
  imported: number;
  skippedDuplicates: number;
  reviewRows: number;
  skippedReview: number;
  rejected: number;
  warnings: number;
  preservedRows: PreservedRow[];
}

export interface LibraryState {
  schemaVersion: 2 | 3 | 4 | 5;
  games: GameEntry[];
  imports: ImportAudit[];
}

export interface DuplicateInfo {
  fingerprint: string;
  name: string;
  date: string;
  existingId?: string;
  sourceFile: string;
  line: number;
}

export interface CommitResult {
  state: LibraryState;
  imported: number;
  skippedDuplicates: number;
  skippedReview: number;
  importedReview: number;
  duplicates: DuplicateInfo[];
  coverImport: CoverImportSummary;
}

export interface CoverImportSummary {
  enabled: boolean;
  searched: number;
  assigned: number;
  notFound: number;
  failed: number;
}

export interface ExportResult {
  filePath: string;
  format: ExportFormat;
  rows: number;
  warnings: string[];
  warningCount: number;
  counts: ExportCounts;
}

export interface ExportCounts {
  converted: number;
  scoreToRecommendation: number;
  recommendationToScore: number;
  noRatingFallback: number;
  omittedRatings: number;
  conflicts: number;
  unknownRecommendations: number;
}

export interface GameDraft {
  name: string;
  date: string;
  score: number | null;
  recommendation: string | null;
  platform?: Platform | null;
  cover?: GameCover | null;
  notes: string;
  year: number | null;
  ratingMode?: CanonicalRatingMode;
  completed?: boolean;
  platinum?: boolean;
  favorite?: boolean;
}
