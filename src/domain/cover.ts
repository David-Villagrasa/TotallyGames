export const COVER_PROVIDERS = ["howlongtobeat", "thegamesdb", "manual"] as const;

export type CoverProvider = (typeof COVER_PROVIDERS)[number];

export interface GameCover {
  provider: CoverProvider;
  key: string;
  title: string;
  sourceId: string | null;
  sourceUrl: string | null;
}

export function isCoverProvider(value: unknown): value is CoverProvider {
  return COVER_PROVIDERS.includes(value as CoverProvider);
}

export function isSafeCoverKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^cover-[A-Za-z0-9-]+\.(?:jpg|jpeg|png|webp)$/.test(value)
  );
}

export function isGameCover(value: unknown): value is GameCover {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const cover = value as Partial<GameCover>;
  return (
    isCoverProvider(cover.provider) &&
    isSafeCoverKey(cover.key) &&
    typeof cover.title === "string" &&
    cover.title.length > 0 &&
    cover.title.length <= 300 &&
    (cover.sourceId === null || typeof cover.sourceId === "string") &&
    (cover.sourceUrl === null || typeof cover.sourceUrl === "string")
  );
}
