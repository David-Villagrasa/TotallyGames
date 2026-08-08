import { normalizeText } from "./text";

export const PLATFORM_LABELS = [
  "Nintendo Switch",
  "Play Station",
  "PC - Steam",
  "PC - Emulated",
  "Xbox",
] as const;

export type Platform = (typeof PLATFORM_LABELS)[number];

export const SUPPORTED_PLATFORMS = PLATFORM_LABELS;
export const PLATFORM_COLUMN_LABEL = "Plataforma";
export const RAW_PLATFORM_EXTRA_KEY = "raw-platform";

export function canonicalizePlatform(value: unknown): Platform | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeText(value);
  return (
    PLATFORM_LABELS.find((label) => normalizeText(label) === normalized) ?? null
  );
}

export const recognizePlatform = canonicalizePlatform;
export const normalizePlatform = canonicalizePlatform;

export function isPlatform(value: unknown): value is Platform {
  return canonicalizePlatform(value) === value;
}

export const isValidPlatform = isPlatform;
export const isCanonicalPlatform = isPlatform;
