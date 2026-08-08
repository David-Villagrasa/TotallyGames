import { net } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, rm, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { GameCover } from "../domain/cover";
import { isSafeCoverKey } from "../domain/cover";
import type { CoverSearchResult } from "../shared/api";

const MAX_COVER_BYTES = 10 * 1024 * 1024;
const HLTB_ORIGIN = "https://howlongtobeat.com";
const THEGAMESDB_ORIGIN = "https://thegamesdb.net";
const THEGAMESDB_CDN_ORIGIN = "https://cdn.thegamesdb.net";
const MAX_PREVIEW_CACHE_ENTRIES = 100;

type ImageExtension = "jpg" | "png" | "webp";

function imageExtensionFromBuffer(buffer: Uint8Array): ImageExtension | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpg";
  }
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

function extensionFromContentType(value: string | null): ImageExtension | null {
  const contentType = value?.split(";", 1)[0].trim().toLowerCase();
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

function assertRemoteImageUrl(
  value: string,
  provider: CoverSearchResult["provider"],
): URL {
  const url = new URL(value);
  const validHltb =
    provider === "howlongtobeat" &&
    url.origin === HLTB_ORIGIN &&
    url.pathname.toLowerCase().startsWith("/games/");
  const validTheGamesDb =
    provider === "thegamesdb" && url.origin === THEGAMESDB_CDN_ORIGIN;
  if (!validHltb && !validTheGamesDb) {
    throw new Error("La imagen remota no pertenece al proveedor seleccionado.");
  }
  return url;
}

function titleFromFilePath(filePath: string): string {
  const fileName = basename(filePath);
  return fileName.slice(0, Math.max(0, fileName.length - extname(fileName).length));
}

function dataUrlFor(buffer: Uint8Array, extension: ImageExtension): string {
  const mime =
    extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : "image/jpeg";
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

export class CoverStore {
  private readonly previewCache = new Map<string, string>();

  constructor(private readonly directory: string) {}

  private async saveBuffer(
    buffer: Uint8Array,
    extension: ImageExtension,
  ): Promise<string> {
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_COVER_BYTES) {
      throw new Error("La portada supera el tamaño máximo permitido.");
    }
    if (imageExtensionFromBuffer(buffer) !== extension) {
      throw new Error("El fichero descargado no es una imagen compatible.");
    }
    await mkdir(this.directory, { recursive: true });
    const key = `cover-${randomUUID()}.${extension}`;
    await writeFile(join(this.directory, key), buffer);
    return key;
  }

  private async fetchSearchImage(result: CoverSearchResult): Promise<{
    buffer: Uint8Array;
    extension: ImageExtension;
    detailUrl: URL;
  }> {
    if (
      result.provider !== "howlongtobeat" &&
      result.provider !== "thegamesdb"
    ) {
      throw new Error("Proveedor de portadas no valido.");
    }
    const imageUrl = assertRemoteImageUrl(result.imageUrl, result.provider);
    const detailUrl = new URL(result.detailUrl);
    const validDetailUrl =
      (result.provider === "howlongtobeat" &&
        detailUrl.origin === HLTB_ORIGIN &&
        detailUrl.pathname.startsWith("/game/")) ||
      (result.provider === "thegamesdb" &&
        detailUrl.origin === THEGAMESDB_ORIGIN &&
        detailUrl.pathname === "/game.php");
    if (!validDetailUrl) {
      throw new Error("La referencia de la portada no pertenece al proveedor seleccionado.");
    }
    const response = await net.fetch(imageUrl.toString(), {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        Referer:
          result.provider === "howlongtobeat"
            ? `${HLTB_ORIGIN}/`
            : `${THEGAMESDB_ORIGIN}/`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `${result.provider} no pudo entregar la portada (${response.status}).`,
      );
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_COVER_BYTES) {
      throw new Error("La portada supera el tamaño máximo permitido.");
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    const extension =
      imageExtensionFromBuffer(buffer) ??
      extensionFromContentType(response.headers.get("content-type"));
    if (!extension) throw new Error("La respuesta remota no es una imagen compatible.");

    return { buffer, extension, detailUrl };
  }

  async readSearchPreview(result: CoverSearchResult): Promise<string> {
    const cached = this.previewCache.get(result.imageUrl);
    if (cached) return cached;

    const { buffer, extension } = await this.fetchSearchImage(result);
    const dataUrl = dataUrlFor(buffer, extension);
    if (this.previewCache.size >= MAX_PREVIEW_CACHE_ENTRIES) {
      const oldest = this.previewCache.keys().next().value;
      if (oldest) this.previewCache.delete(oldest);
    }
    this.previewCache.set(result.imageUrl, dataUrl);
    return dataUrl;
  }

  async saveSearchResult(result: CoverSearchResult): Promise<GameCover> {
    const { buffer, extension, detailUrl } = await this.fetchSearchImage(result);

    return {
      provider: result.provider,
      key: await this.saveBuffer(buffer, extension),
      title: result.title,
      sourceId: result.sourceId,
      sourceUrl: detailUrl.toString(),
    };
  }

  async saveLocalFile(filePath: string): Promise<GameCover> {
    const buffer = await readFile(filePath);
    const extension = imageExtensionFromBuffer(buffer);
    if (!extension) throw new Error("El fichero seleccionado no es una imagen compatible.");
    return {
      provider: "manual",
      key: await this.saveBuffer(buffer, extension),
      title: titleFromFilePath(filePath),
      sourceId: null,
      sourceUrl: null,
    };
  }

  async readDataUrl(key: string): Promise<string | null> {
    if (!isSafeCoverKey(key)) throw new Error("Clave de portada no válida.");
    try {
      const buffer = await readFile(join(this.directory, key));
      const extension = key.split(".").at(-1);
      const imageExtension =
        extension === "png" || extension === "webp" ? extension : "jpg";
      return dataUrlFor(buffer, imageExtension);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async clear(): Promise<void> {
    await rm(this.directory, { recursive: true, force: true });
  }
}
