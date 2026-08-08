import { randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import type {
  CanonicalRatingMode,
  CommitResult,
  CoverImportSummary,
  DuplicateInfo,
  GameDraft,
  GameEntry,
  GameStatusKey,
  ImportAudit,
  ImportBatch,
  LibraryState,
  RatingConflict,
  SourceRef,
  ImportCoverResolver,
} from "./types";
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
  isPlatform,
  RAW_PLATFORM_EXTRA_KEY,
} from "./platform";
import { isGameCover } from "./cover";
import { createFingerprint } from "./text";
import { isValidDate, validateGameDraft } from "./validation";
import {
  addReviewReason,
  isReviewReason,
  normalizeReviewReasons,
  RAW_DATE_EXTRA_KEY,
  createImportRowKey,
} from "./review";

export const CURRENT_SCHEMA_VERSION = 5 as const;

const EMPTY_STATE: LibraryState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  games: [],
  imports: [],
};

function cloneEmptyState(): LibraryState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    games: [],
    imports: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCanonicalRatingMode(value: unknown): value is CanonicalRatingMode {
  return (
    value === "legacy-2021" ||
    value === "semicolon-score" ||
    value === "semicolon-recommendation"
  );
}

function isRatingMode(value: unknown): boolean {
  return isCanonicalRatingMode(value) || value === "mixed";
}

function isSourceRef(value: unknown): value is SourceRef {
  if (!isRecord(value)) return false;
  return (
    typeof value.filePath === "string" &&
    typeof value.line === "number" &&
    typeof value.format === "string" &&
    typeof value.raw === "string"
  );
}

function isRatingConflict(value: unknown): value is RatingConflict {
  if (!isRecord(value)) return false;
  return (
    (value.score === null || isValidScore(value.score)) &&
    (value.recommendation === null || typeof value.recommendation === "string") &&
    (value.rawScore === undefined || typeof value.rawScore === "string") &&
    (value.rawRecommendation === undefined ||
      typeof value.rawRecommendation === "string")
  );
}

function isGameEntry(value: unknown): value is GameEntry {
  if (!isRecord(value)) return false;
  const extra = value.extra;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.year === null || typeof value.year === "number") &&
    typeof value.date === "string" &&
    (value.score === null || isValidScore(value.score)) &&
    (value.recommendation === null || typeof value.recommendation === "string") &&
    (value.platform === null || isPlatform(value.platform)) &&
    (value.cover === null || isGameCover(value.cover)) &&
    typeof value.notes === "string" &&
    isRecord(extra) &&
    Object.values(extra).every((entry) => typeof entry === "string") &&
    isSourceRef(value.source) &&
    isRatingMode(value.ratingMode) &&
    typeof value.completed === "boolean" &&
    typeof value.platinum === "boolean" &&
    typeof value.favorite === "boolean" &&
    typeof value.needsReview === "boolean" &&
    (value.reviewReasons === undefined ||
      (Array.isArray(value.reviewReasons) && value.reviewReasons.every(isReviewReason))) &&
    (value.ratingConflict === undefined || isRatingConflict(value.ratingConflict)) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isCurrentLibraryState(value: unknown): value is LibraryState {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === CURRENT_SCHEMA_VERSION &&
    Array.isArray(value.games) &&
    value.games.every(isGameEntry) &&
    Array.isArray(value.imports)
  );
}

async function writeJsonAtomically(
  filePath: string,
  value: LibraryState,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(tempPath, JSON.stringify(value, null, 2), "utf8");
    await rm(filePath, { force: true });
    await rename(tempPath, filePath);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}

function isNodeError(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}

function serializedValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function preserveExtra(
  extra: Record<string, string>,
  key: string,
  value: unknown,
): void {
  const serialized = serializedValue(value);
  if (!(key in extra)) {
    extra[key] = serialized;
  } else if (extra[key] !== serialized) {
    extra[`${key}-migration`] = serialized;
  }
}

function cloneLegacyExtra(value: unknown): Record<string, string> {
  if (value === undefined) return {};
  if (!isRecord(value)) throw new Error("El campo extra de un juego no es valido.");
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, serializedValue(entry)]),
  );
}

function requireString(
  record: Record<string, unknown>,
  field: string,
  context: string,
): string {
  if (typeof record[field] !== "string") {
    throw new Error(`El campo ${field} de ${context} no es valido.`);
  }
  return record[field] as string;
}

function readLegacySource(
  record: Record<string, unknown>,
  context: string,
): SourceRef {
  if (!isSourceRef(record.source)) {
    throw new Error(`La fuente de ${context} no es válida.`);
  }
  return record.source;
}

function inferLegacyRatingMode(
  sourceFormat: SourceRef["format"],
  hasScore: boolean,
  hasRecommendation: boolean,
): "legacy-2021" | "semicolon-score" | "semicolon-recommendation" | "mixed" {
  if (hasScore && hasRecommendation) return "mixed";

  if (isCanonicalRatingMode(sourceFormat)) {
    if (sourceFormat === "legacy-2021" && !hasScore && !hasRecommendation) {
      return "legacy-2021";
    }
    if (sourceFormat === "semicolon-score" && !hasRecommendation) {
      return "semicolon-score";
    }
    if (sourceFormat === "semicolon-recommendation" && !hasScore) {
      return "semicolon-recommendation";
    }
    return "mixed";
  }

  if (sourceFormat === "semicolon-recommendation-platform" && !hasScore) {
    return "semicolon-recommendation";
  }

  if (hasScore) return "semicolon-score";
  if (hasRecommendation) return "semicolon-recommendation";
  return sourceFormat === "semicolon-mixed" ? "mixed" : "legacy-2021";
}

function migrateGame(value: unknown, index: number): GameEntry {
  if (!isRecord(value)) {
    throw new Error(`El juego ${index + 1} de la biblioteca no es valido.`);
  }
  const context = `el juego ${index + 1}`;
  const extra = cloneLegacyExtra(value.extra);
  const source = readLegacySource(value, context);
  const statusValue = (field: GameStatusKey): boolean => {
    const rawStatus = value[field];
    if (rawStatus === undefined) return false;
    if (typeof rawStatus === "boolean") return rawStatus;
    preserveExtra(extra, `raw-${field}`, rawStatus);
    return false;
  };

  const rawScore = value.score;
  const hasRawScore =
    rawScore !== null && rawScore !== undefined && rawScore !== "";
  let score: number | null = null;
  let needsReview = value.needsReview === true;
  const reviewReasons = normalizeReviewReasons(value.reviewReasons);
  if (hasRawScore && isValidScore(rawScore)) {
    score = normalizeScore(rawScore);
  } else if (hasRawScore) {
    needsReview = true;
    addReviewReason(reviewReasons, "invalid-score");
    preserveExtra(extra, RAW_SCORE_EXTRA_KEY, rawScore);
  }

  const rawRecommendation = value.recommendation;
  const hasRawRecommendation =
    rawRecommendation !== null &&
    rawRecommendation !== undefined &&
    rawRecommendation !== "";
  let recommendation: string | null = null;
  if (hasRawRecommendation) {
    const canonical = canonicalizeRecommendation(rawRecommendation);
    if (canonical) {
      recommendation = canonical;
      if (canonical !== rawRecommendation) {
        preserveExtra(extra, RAW_RECOMMENDATION_EXTRA_KEY, rawRecommendation);
      }
    } else {
      needsReview = true;
      addReviewReason(reviewReasons, "unknown-recommendation");
      recommendation =
        typeof rawRecommendation === "string" ? rawRecommendation : null;
      preserveExtra(extra, RAW_RECOMMENDATION_EXTRA_KEY, rawRecommendation);
    }
  }

  const hasScore = hasRawScore;
  const hasRecommendation = hasRawRecommendation;
  const ratingMode = inferLegacyRatingMode(
    source.format,
    hasScore,
    hasRecommendation,
  );
  if (ratingMode === "mixed") {
    needsReview = true;
    addReviewReason(reviewReasons, "mixed-rating-fields");
  }
  const rawScoreText = hasRawScore ? serializedValue(rawScore) : undefined;
  const rawRecommendationText = hasRawRecommendation
    ? serializedValue(rawRecommendation)
    : undefined;
  const ratingConflict =
    hasScore && hasRecommendation
      ? {
          score,
          recommendation,
          rawScore: rawScoreText,
          rawRecommendation: rawRecommendationText,
        }
      : undefined;
  if (ratingConflict) {
    needsReview = true;
    addReviewReason(reviewReasons, "mixed-rating-fields");
    preserveExtra(extra, RATING_CONFLICT_EXTRA_KEY, "score-and-recommendation");
    if (rawScoreText) preserveExtra(extra, RAW_SCORE_EXTRA_KEY, rawScoreText);
    if (rawRecommendationText) {
      preserveExtra(
        extra,
        RAW_RECOMMENDATION_EXTRA_KEY,
        rawRecommendationText,
      );
    }
  }

  const rawPlatform = value.platform;
  const hasRawPlatform =
    rawPlatform !== null && rawPlatform !== undefined && rawPlatform !== "";
  let platform: ReturnType<typeof canonicalizePlatform> = null;
  if (hasRawPlatform) {
    if (typeof rawPlatform === "string") {
      const trimmedPlatform = rawPlatform.trim();
      if (trimmedPlatform) {
        const canonical = canonicalizePlatform(trimmedPlatform);
        if (canonical) {
          platform = canonical;
          if (canonical !== trimmedPlatform) {
            preserveExtra(extra, RAW_PLATFORM_EXTRA_KEY, trimmedPlatform);
          }
        } else {
          needsReview = true;
          addReviewReason(reviewReasons, "unknown-platform");
          preserveExtra(extra, RAW_PLATFORM_EXTRA_KEY, trimmedPlatform);
        }
      }
    } else {
      needsReview = true;
      addReviewReason(reviewReasons, "unknown-platform");
      preserveExtra(extra, RAW_PLATFORM_EXTRA_KEY, rawPlatform);
    }
  }

  const date = requireString(value, "date", context);
  if (!isValidDate(date)) {
    needsReview = true;
    addReviewReason(reviewReasons, date ? "invalid-date" : "missing-date");
    if (date) preserveExtra(extra, RAW_DATE_EXTRA_KEY, date);
  }

  const cover =
    value.cover === undefined || value.cover === null
      ? null
      : isGameCover(value.cover)
        ? value.cover
        : (() => {
            throw new Error(`El campo cover de ${context} no es valido.`);
          })();

  if (value.needsReview !== undefined && typeof value.needsReview !== "boolean") {
    throw new Error(`El campo needsReview de ${context} no es valido.`);
  }

  const migrated = {
    ...value,
    id: requireString(value, "id", context),
    name: requireString(value, "name", context),
    year:
      value.year === null || value.year === undefined
        ? null
        : typeof value.year === "number"
          ? value.year
          : (() => {
              throw new Error(`El campo year de ${context} no es valido.`);
            })(),
    date,
    score,
    recommendation,
    platform,
    cover,
    notes: requireString(value, "notes", context),
    extra,
    source,
    ratingMode,
    completed: statusValue("completed"),
    platinum: statusValue("platinum"),
    favorite: statusValue("favorite"),
    needsReview,
    reviewReasons,
    ...(ratingConflict ? { ratingConflict } : {}),
    createdAt: requireString(value, "createdAt", context),
    updatedAt: requireString(value, "updatedAt", context),
  } as GameEntry;

  return migrated;
}

function migrateLibraryState(value: Record<string, unknown>): LibraryState {
  if (!Array.isArray(value.games) || !Array.isArray(value.imports)) {
    throw new Error("La estructura de la biblioteca no es válida.");
  }
  return {
    ...value,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    games: value.games.map((game, index) => migrateGame(game, index)),
    imports: value.imports as ImportAudit[],
  } as LibraryState;
}

async function createMigrationBackup(filePath: string): Promise<void> {
  const backupPath = `${filePath}.bak`;
  try {
    await copyFile(filePath, backupPath, fsConstants.COPYFILE_EXCL);
  } catch (error) {
    if (!isNodeError(error, "EEXIST")) throw error;
  }
}

export class JsonGameRepository {
  private state: LibraryState | null = null;

  constructor(private readonly filePath: string) {}

  async load(): Promise<LibraryState> {
    if (this.state) return this.state;

    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (isNodeError(error, "ENOENT")) {
        this.state = cloneEmptyState();
        return this.state;
      }
      throw new Error(
        `No se pudo leer la biblioteca: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `La biblioteca contiene JSON corrupto y no se ha sobrescrito: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!isRecord(parsed) || typeof parsed.schemaVersion !== "number") {
      throw new Error(
        "La biblioteca no tiene una estructura reconocible y no se ha sobrescrito.",
      );
    }

    if (parsed.schemaVersion === CURRENT_SCHEMA_VERSION) {
      if (!isCurrentLibraryState(parsed)) {
        throw new Error(
          "La biblioteca no es válida y no se ha sobrescrito.",
        );
      }
      this.state = parsed;
      return this.state;
    }

    if (
      parsed.schemaVersion !== 1 &&
      parsed.schemaVersion !== 2 &&
       parsed.schemaVersion !== 3 &&
       parsed.schemaVersion !== 4
    ) {
      throw new Error(
        `La versión ${parsed.schemaVersion} de la biblioteca no es compatible y no se ha sobrescrito.`,
      );
    }

    const migrated = migrateLibraryState(parsed);
    await createMigrationBackup(this.filePath);
    await writeJsonAtomically(this.filePath, migrated);
    this.state = migrated;
    return this.state;
  }

  private async save(): Promise<LibraryState> {
    if (!this.state) await this.load();
    await writeJsonAtomically(this.filePath, this.state ?? EMPTY_STATE);
    return this.state ?? EMPTY_STATE;
  }

  async commitImport(
    batch: ImportBatch,
    allowDuplicates: boolean,
    coverResolver?: ImportCoverResolver,
    reviewRowKeys: readonly string[] = [],
  ): Promise<CommitResult> {
    const state = await this.load();
    const fingerprints = new Map<string, string>();
    state.games.forEach((game) => {
      fingerprints.set(createFingerprint(game), game.id);
    });

    const duplicates: DuplicateInfo[] = [];
    let imported = 0;
    let importedReview = 0;
    let skippedDuplicates = 0;
    let skippedReview = 0;
    const selectedReviewRows = new Set(reviewRowKeys);

    for (const file of batch.files) {
      let importedFromFile = 0;
      let skippedFromFile = 0;
      let skippedReviewFromFile = 0;
      const reviewRowsFromFile = file.rows.filter((row) => row.needsReview).length;
      for (const parsed of file.rows) {
        if (
          parsed.needsReview &&
          !selectedReviewRows.has(createImportRowKey(parsed.source))
        ) {
          skippedReview += 1;
          skippedReviewFromFile += 1;
          continue;
        }
        const fingerprint = createFingerprint(parsed);
        const existingId = fingerprints.get(fingerprint);
        if (existingId && !allowDuplicates) {
          duplicates.push({
            fingerprint,
            name: parsed.name,
            date: parsed.date,
            existingId,
            sourceFile: parsed.source.filePath,
            line: parsed.source.line,
          });
          skippedDuplicates += 1;
          skippedFromFile += 1;
          continue;
        }

        const now = new Date().toISOString();
        const id = randomUUID();
        const cover = coverResolver
          ? await coverResolver(parsed)
          : parsed.cover;
        const game: GameEntry = {
          ...parsed,
          cover,
          id,
          createdAt: now,
          updatedAt: now,
        };
        state.games.push(game);
        fingerprints.set(fingerprint, id);
        imported += 1;
        importedFromFile += 1;
        if (parsed.needsReview) importedReview += 1;
      }

      const audit: ImportAudit = {
        id: randomUUID(),
        createdAt: batch.createdAt,
        filePath: file.filePath,
        fileName: file.fileName,
        format: file.format,
        year: file.year,
        ...(file.years ? { years: file.years } : {}),
        imported: importedFromFile,
        skippedDuplicates: skippedFromFile,
        reviewRows: reviewRowsFromFile,
        skippedReview: skippedReviewFromFile,
        rejected: file.preservedRows.filter((row) => row.kind === "rejected").length,
        warnings: file.warnings.length,
        preservedRows: file.preservedRows,
      };
      state.imports.unshift(audit);
    }

    await this.save();
    const coverImport: CoverImportSummary = {
      enabled: false,
      searched: 0,
      assigned: 0,
      notFound: 0,
      failed: 0,
    };
    return {
      state,
      imported,
      skippedDuplicates,
      skippedReview,
      importedReview,
      duplicates,
      coverImport,
    };
  }

  async createGame(draft: GameDraft): Promise<LibraryState> {
    const validated = validateGameDraft(draft);
    const state = await this.load();
    const now = new Date().toISOString();
    state.games.push({
      id: randomUUID(),
      name: validated.name,
      year: validated.year,
      date: validated.date,
      score: validated.score,
      recommendation: validated.recommendation,
      platform: validated.platform,
       cover: validated.cover ?? null,
       notes: validated.notes,
       extra: validated.extra,
       completed: validated.completed,
       platinum: validated.platinum,
       favorite: validated.favorite,
        source: { filePath: "manual", line: 0, format: "unknown", raw: "" },
       ratingMode: validated.ratingMode,
       needsReview: validated.needsReview,
       reviewReasons: validated.reviewReasons,
       createdAt: now,
      updatedAt: now,
    });
    await this.save();
    return state;
  }

  async updateGame(id: string, draft: GameDraft): Promise<LibraryState> {
    const validated = validateGameDraft(draft);
    const state = await this.load();
    const game = state.games.find((candidate) => candidate.id === id);
    if (!game) throw new Error("Juego no encontrado.");
    game.name = validated.name;
    game.date = validated.date;
    game.year = validated.year;
    game.score = validated.score;
    game.recommendation = validated.recommendation;
    const preservePlatform = draft.platform === undefined;
    if (!preservePlatform) {
      game.platform = validated.platform;
      if (validated.extra[RAW_PLATFORM_EXTRA_KEY] === undefined) {
        delete game.extra[RAW_PLATFORM_EXTRA_KEY];
      }
    }
    if (draft.cover !== undefined) game.cover = validated.cover ?? null;
    game.notes = validated.notes;
    if (draft.completed !== undefined) game.completed = validated.completed;
    if (draft.platinum !== undefined) game.platinum = validated.platinum;
    if (draft.favorite !== undefined) game.favorite = validated.favorite;
    Object.assign(game.extra, validated.extra);
    if (validated.date) delete game.extra[RAW_DATE_EXTRA_KEY];
    game.ratingMode = validated.ratingMode;
    const reviewReasons = [...validated.reviewReasons];
    if (
      preservePlatform &&
      game.platform === null &&
      game.extra[RAW_PLATFORM_EXTRA_KEY] !== undefined
    ) {
      addReviewReason(reviewReasons, "unknown-platform");
    }
    game.reviewReasons = reviewReasons;
    game.needsReview = reviewReasons.length > 0;
    delete game.ratingConflict;
    game.updatedAt = new Date().toISOString();
    await this.save();
    return state;
  }

  async updateGameStatus(
    id: string,
    status: GameStatusKey,
    value: boolean,
  ): Promise<LibraryState> {
    if (
      status !== "completed" &&
      status !== "platinum" &&
      status !== "favorite"
    ) {
      throw new Error("Estado de juego no válido.");
    }
    const state = await this.load();
    const game = state.games.find((candidate) => candidate.id === id);
    if (!game) throw new Error("Juego no encontrado.");
    game[status] = value;
    game.updatedAt = new Date().toISOString();
    await this.save();
    return state;
  }

  async deleteGames(ids: string[]): Promise<LibraryState> {
    const state = await this.load();
    const idSet = new Set(ids);
    state.games = state.games.filter((game) => !idSet.has(game.id));
    await this.save();
    return state;
  }

  async reset(): Promise<void> {
    this.state = cloneEmptyState();
    await this.save();
  }
}
