import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
  AppSettings,
  AppSettingsInput,
  LegacyAppSettings,
  Locale,
  PreviousAppSettings,
  PreviousTheGamesDbAppSettings,
  TableMode,
} from "../shared/api";

export const SETTINGS_SCHEMA_VERSION = 4 as const;
export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  locale: "es",
  platformColumnEnabled: false,
  theGamesDbApiKey: "",
  tableMode: "legacy",
};

export function getDefaultSettings(locale: Locale = DEFAULT_SETTINGS.locale): AppSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    locale,
    platformColumnEnabled: false,
    theGamesDbApiKey: "",
    tableMode: "legacy",
  };
}

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en" || value === "ja";
}

export function isTableMode(value: unknown): value is TableMode {
  return value === "legacy" || value === "neo";
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppSettings>;
  return (
    candidate.schemaVersion === SETTINGS_SCHEMA_VERSION &&
    isLocale(candidate.locale) &&
    typeof candidate.platformColumnEnabled === "boolean" &&
    typeof candidate.theGamesDbApiKey === "string" &&
    candidate.theGamesDbApiKey.length <= 500 &&
    isTableMode(candidate.tableMode)
  );
}

export function isLegacyAppSettings(value: unknown): value is LegacyAppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LegacyAppSettings>;
  return candidate.schemaVersion === 1 && isLocale(candidate.locale);
}

export function isPreviousAppSettings(
  value: unknown,
): value is PreviousAppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PreviousAppSettings>;
  return (
    candidate.schemaVersion === 2 &&
    isLocale(candidate.locale) &&
    typeof candidate.platformColumnEnabled === "boolean"
  );
}

export function isPreviousTheGamesDbAppSettings(
  value: unknown,
): value is PreviousTheGamesDbAppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PreviousTheGamesDbAppSettings>;
  return (
    candidate.schemaVersion === 3 &&
    isLocale(candidate.locale) &&
    typeof candidate.platformColumnEnabled === "boolean" &&
    typeof candidate.theGamesDbApiKey === "string" &&
    candidate.theGamesDbApiKey.length <= 500
  );
}

export function isAppSettingsInput(value: unknown): value is AppSettingsInput {
  return (
    isAppSettings(value) ||
    isPreviousTheGamesDbAppSettings(value) ||
    isPreviousAppSettings(value) ||
    isLegacyAppSettings(value)
  );
}

export class SettingsStore {
  constructor(
    private readonly filePath: string,
    private readonly systemLocale: Locale = DEFAULT_SETTINGS.locale,
  ) {}

  async load(): Promise<AppSettings> {
    let raw: string;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
       if (isNodeErrorWithCode(error, "ENOENT")) {
         return getDefaultSettings(this.systemLocale);
       }
      throw error;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (isAppSettings(parsed)) {
        return {
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          locale: parsed.locale,
          platformColumnEnabled: parsed.platformColumnEnabled,
          theGamesDbApiKey: parsed.theGamesDbApiKey,
          tableMode: parsed.tableMode,
        };
      }
      if (
        isPreviousTheGamesDbAppSettings(parsed) ||
        isPreviousAppSettings(parsed) ||
        isLegacyAppSettings(parsed)
      ) {
        const migrated = {
          schemaVersion: SETTINGS_SCHEMA_VERSION,
          locale: parsed.locale,
          platformColumnEnabled:
            "platformColumnEnabled" in parsed
              ? parsed.platformColumnEnabled
              : false,
          theGamesDbApiKey: isPreviousTheGamesDbAppSettings(parsed)
            ? parsed.theGamesDbApiKey
            : "",
          tableMode: "legacy",
        } satisfies AppSettings;
        await writeJsonAtomically(this.filePath, migrated);
        return migrated;
      }
      return getDefaultSettings(this.systemLocale);
    } catch {
      return getDefaultSettings(this.systemLocale);
    }
  }

  async save(settings: AppSettingsInput): Promise<AppSettings> {
    if (!isAppSettingsInput(settings)) throw new Error("Configuración no válida.");
    const current = await this.load();
    const platformColumnEnabled =
      isAppSettings(settings) ||
      isPreviousTheGamesDbAppSettings(settings) ||
      isPreviousAppSettings(settings)
        ? settings.platformColumnEnabled
        : current.platformColumnEnabled;
    const theGamesDbApiKey =
      isAppSettings(settings) || isPreviousTheGamesDbAppSettings(settings)
        ? settings.theGamesDbApiKey.trim()
        : current.theGamesDbApiKey;
    const tableMode = isAppSettings(settings)
      ? settings.tableMode
      : current.tableMode;
    const normalized: AppSettings = {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      locale: settings.locale,
      platformColumnEnabled,
      theGamesDbApiKey,
      tableMode,
    };
    await writeJsonAtomically(this.filePath, normalized);
    return { ...normalized };
  }

  async reset(): Promise<AppSettings> {
    return this.save(getDefaultSettings(this.systemLocale));
  }
}

async function writeJsonAtomically(
  filePath: string,
  value: AppSettings,
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
