import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CoverSearchResult } from "../shared/api";
import { normalizeText } from "../domain/text";

export const COVER_SEARCH_CACHE_SCHEMA_VERSION = 1 as const;
const MAX_CACHE_ENTRIES = 500;
const MAX_RESULTS_PER_QUERY = 20;
export type CoverSearchCacheScope = "thegamesdb" | "hltb";

interface CoverSearchCacheDocument {
  schemaVersion: typeof COVER_SEARCH_CACHE_SCHEMA_VERSION;
  entries: Record<string, CoverSearchResult[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isCachedResult(value: unknown): value is CoverSearchResult {
  if (!isRecord(value)) return false;
  return (
    (value.provider === "howlongtobeat" || value.provider === "thegamesdb") &&
    typeof value.sourceId === "string" &&
    value.sourceId.length > 0 &&
    value.sourceId.length <= 100 &&
    typeof value.title === "string" &&
    value.title.length > 0 &&
    value.title.length <= 300 &&
    typeof value.imageUrl === "string" &&
    value.imageUrl.length > 0 &&
    typeof value.detailUrl === "string" &&
    value.detailUrl.length > 0
  );
}

function emptyDocument(): CoverSearchCacheDocument {
  return {
    schemaVersion: COVER_SEARCH_CACHE_SCHEMA_VERSION,
    entries: {},
  };
}

function parseDocument(value: unknown): CoverSearchCacheDocument {
  if (!isRecord(value) || value.schemaVersion !== COVER_SEARCH_CACHE_SCHEMA_VERSION) {
    return emptyDocument();
  }

  const entries: Record<string, CoverSearchResult[]> = {};
  if (!isRecord(value.entries)) return { ...emptyDocument(), entries };

  for (const [query, rawResults] of Object.entries(value.entries)) {
    if (!Array.isArray(rawResults)) continue;
    const results = rawResults.filter(isCachedResult).slice(0, MAX_RESULTS_PER_QUERY);
    entries[query] = results;
  }
  return { schemaVersion: COVER_SEARCH_CACHE_SCHEMA_VERSION, entries };
}

export function normalizeCoverSearchQuery(query: string): string {
  return normalizeText(query);
}

function cacheKey(query: string, scope: CoverSearchCacheScope): string | null {
  const normalized = normalizeCoverSearchQuery(query);
  return normalized ? `${scope}:${normalized}` : null;
}

export class CoverSearchCache {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async get(
    query: string,
    scope: CoverSearchCacheScope,
  ): Promise<CoverSearchResult[] | undefined> {
    const key = cacheKey(query, scope);
    if (key === null) return undefined;
    await this.writeQueue;
    const document = await this.readDocument();
    const results = document.entries[key];
    return results ? results.map((result) => ({ ...result })) : undefined;
  }

  set(
    query: string,
    scope: CoverSearchCacheScope,
    results: CoverSearchResult[],
  ): Promise<void> {
    const key = cacheKey(query, scope);
    if (key === null) return Promise.resolve();

    const operation = this.writeQueue.then(async () => {
      const document = await this.readDocument();
      const entries = { ...document.entries, [key]: results.slice(0, MAX_RESULTS_PER_QUERY) };
      const keys = Object.keys(entries);
      while (keys.length > MAX_CACHE_ENTRIES) {
        const oldest = keys.shift();
        if (oldest) delete entries[oldest];
      }
      await writeJsonAtomically(this.filePath, {
        schemaVersion: COVER_SEARCH_CACHE_SCHEMA_VERSION,
        entries,
      });
    });
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  clear(): Promise<void> {
    const operation = this.writeQueue.then(() =>
      rm(this.filePath, { force: true }),
    );
    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  private async readDocument(): Promise<CoverSearchCacheDocument> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      try {
        return parseDocument(JSON.parse(raw) as unknown);
      } catch {
        return emptyDocument();
      }
    } catch (error) {
      if (isNodeErrorWithCode(error, "ENOENT")) return emptyDocument();
      throw error;
    }
  }
}

async function writeJsonAtomically(
  filePath: string,
  value: CoverSearchCacheDocument,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(value, null, 2), "utf8");
    await rm(filePath, { force: true });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function isNodeErrorWithCode(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
