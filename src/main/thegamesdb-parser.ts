import type { CoverSearchResult } from "../shared/api";

const WEB_ORIGIN = "https://thegamesdb.net";
const CDN_ORIGIN = "https://cdn.thegamesdb.net";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function imageUrlFor(
  baseUrl: Record<string, unknown> | undefined,
  image: Record<string, unknown> | undefined,
): string | null {
  const base = asString(baseUrl?.large) ?? asString(baseUrl?.original);
  const filename = asString(image?.filename);
  if (!base || !filename) return null;
  const url = new URL(filename, base);
  return url.origin === CDN_ORIGIN ? url.toString() : null;
}

export function parseTheGamesDbResults(payload: unknown): CoverSearchResult[] {
  if (!isRecord(payload)) return [];
  const data = isRecord(payload.data) ? payload.data : null;
  const games = Array.isArray(data?.games) ? data.games : [];
  const include = isRecord(payload.include) ? payload.include : null;
  const boxart = isRecord(include?.boxart) ? include.boxart : null;
  const baseUrl = isRecord(boxart?.base_url) ? boxart.base_url : undefined;
  const imagesByGame = isRecord(boxart?.data) ? boxart.data : {};
  const results: CoverSearchResult[] = [];

  for (const game of games) {
    if (!isRecord(game)) continue;
    const id = game.id;
    const title = asString(game.game_title);
    if ((typeof id !== "number" && typeof id !== "string") || !title) continue;
    const images = Array.isArray(imagesByGame[String(id)])
      ? (imagesByGame[String(id)] as unknown[])
      : [];
    const front = images.find(
      (image) =>
        isRecord(image) &&
        image.type === "boxart" &&
        (image.side === "front" || image.side === null),
    );
    const imageUrl = imageUrlFor(baseUrl, isRecord(front) ? front : undefined);
    if (!imageUrl) continue;
    results.push({
      provider: "thegamesdb",
      sourceId: String(id),
      title,
      imageUrl,
      detailUrl: `${WEB_ORIGIN}/game.php?id=${encodeURIComponent(String(id))}`,
    });
  }
  return results;
}
