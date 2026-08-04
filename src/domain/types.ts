export type CanonicalRatingMode =
  | "legacy-2021"
  | "semicolon-score"
  | "semicolon-recommendation";

export type RatingMode = CanonicalRatingMode | "mixed";

export type ImportFormat = CanonicalRatingMode | "semicolon-mixed" | "unknown";

export type ExportFormat = CanonicalRatingMode;

export type CanonicalRecommendation =
  | "No Recomendado"
  | "Poco Recomendado"
  | "Recomendado"
  | "Muy Recomendado";

export type IssueSeverity = "info" | "warning" | "error";

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
  notes: string;
  extra: Record<string, string>;
  source: SourceRef;
  ratingMode: RatingMode;
  needsReview: boolean;
  ratingConflict?: RatingConflict;
}

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
  imported: number;
  skippedDuplicates: number;
  rejected: number;
  warnings: number;
  preservedRows: PreservedRow[];
}

export interface LibraryState {
  schemaVersion: 2;
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
  duplicates: DuplicateInfo[];
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
  notes: string;
  year: number | null;
  ratingMode?: CanonicalRatingMode;
}
