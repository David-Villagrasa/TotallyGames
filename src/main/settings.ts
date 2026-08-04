import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AppSettings, Locale } from "../shared/api";

export const SETTINGS_SCHEMA_VERSION = 1 as const;
export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  locale: "es",
};

export function getDefaultSettings(locale: Locale = DEFAULT_SETTINGS.locale): AppSettings {
  return { schemaVersion: SETTINGS_SCHEMA_VERSION, locale };
}

export function isLocale(value: unknown): value is Locale {
  return value === "es" || value === "en" || value === "ja";
}

export function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppSettings>;
  return (
    candidate.schemaVersion === SETTINGS_SCHEMA_VERSION &&
    isLocale(candidate.locale)
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
      return isAppSettings(parsed)
        ? { schemaVersion: SETTINGS_SCHEMA_VERSION, locale: parsed.locale }
        : getDefaultSettings(this.systemLocale);
    } catch {
      return getDefaultSettings(this.systemLocale);
    }
  }

  async save(settings: AppSettings): Promise<AppSettings> {
    if (!isAppSettings(settings)) throw new Error("Configuracion no valida.");
    const normalized: AppSettings = {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      locale: settings.locale,
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
