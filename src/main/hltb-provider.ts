import { BrowserWindow } from "electron";
import type { CoverSearchResult } from "../shared/api";

const HLTB_ORIGIN = "https://howlongtobeat.com";
const SEARCH_TIMEOUT_MS = 15_000;

const SEARCH_SCRIPT = `(() => new Promise((resolve) => {
  const deadline = Date.now() + ${SEARCH_TIMEOUT_MS};
  const extract = () => {
    const bodyText = document.body?.innerText || "";
    if (bodyText.includes("No Results Found")) return [];
    if (!bodyText.includes("We Found")) return null;

    const seen = new Set();
    const results = [];
    for (const link of Array.from(document.querySelectorAll('a[href^="/game/"]'))) {
      const href = link.getAttribute("href") || "";
      const match = href.match(/^\\/game\\/([^/?#]+)/);
      if (!match) continue;
      const card = link.closest("li") || link.parentElement;
      const image = card?.querySelector('img[src*="/games/"]');
      const titleLink = card?.querySelector('h2 a[href^="/game/"]');
      const title = (titleLink?.getAttribute("title") || titleLink?.textContent || link.textContent || "").trim();
      const imageSource = image?.currentSrc || image?.getAttribute("src") || "";
      if (!title || !imageSource || seen.has(match[1])) continue;
      seen.add(match[1]);
      results.push({
        provider: "howlongtobeat",
        sourceId: match[1],
        title,
        imageUrl: new URL(imageSource, location.href).toString(),
        detailUrl: new URL(href, location.href).toString()
      });
    }
    return results;
  };
  const poll = () => {
    const results = extract();
    if (results !== null || Date.now() >= deadline) {
      resolve(results || []);
      return;
    }
    setTimeout(poll, 250);
  };
  poll();
}))()`;

function isAllowedNavigation(value: string): boolean {
  try {
    return new URL(value).origin === HLTB_ORIGIN;
  } catch {
    return false;
  }
}

export class HltbCoverProvider {
  private window: BrowserWindow | null = null;
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;

  async search(query: string): Promise<CoverSearchResult[]> {
    const generation = ++this.generation;
    if (this.window && !this.window.isDestroyed() && this.window.webContents.isLoading()) {
      this.window.webContents.stop();
    }
    const operation = this.queue.then(() =>
      this.searchInternal(query, generation),
    );
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  dispose(): void {
    if (this.window && !this.window.isDestroyed()) this.window.destroy();
    this.window = null;
  }

  private createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      show: false,
      width: 1100,
      height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        partition: "persist:dgt-hltb",
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
      if (!isAllowedNavigation(url)) event.preventDefault();
    });
    window.on("closed", () => {
      if (this.window === window) this.window = null;
    });
    return window;
  }

  private async searchInternal(
    query: string,
    generation: number,
  ): Promise<CoverSearchResult[]> {
    const normalized = query.trim();
    if (normalized.length < 2) return [];
    if (generation !== this.generation) return [];
    if (!this.window || this.window.isDestroyed()) this.window = this.createWindow();
    const searchUrl = `${HLTB_ORIGIN}/?q=${encodeURIComponent(normalized)}`;
    await this.window.loadURL(searchUrl);
    if (generation !== this.generation) return [];
    const result = await this.window.webContents.executeJavaScript(SEARCH_SCRIPT, true);
    if (!Array.isArray(result)) return [];
    return result.filter(
      (candidate): candidate is CoverSearchResult =>
        candidate?.provider === "howlongtobeat" &&
        typeof candidate.sourceId === "string" &&
        typeof candidate.title === "string" &&
        typeof candidate.imageUrl === "string" &&
        typeof candidate.detailUrl === "string",
    );
  }
}
