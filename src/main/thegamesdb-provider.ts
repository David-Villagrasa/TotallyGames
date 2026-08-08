import { net } from "electron";
import type { CoverSearchResult } from "../shared/api";
import { parseTheGamesDbResults } from "./thegamesdb-parser";

const API_ORIGIN = "https://api.thegamesdb.net";
export class TheGamesDbProvider {
  async search(query: string, apiKey: string): Promise<CoverSearchResult[]> {
    const normalized = query.trim();
    const key = apiKey.trim();
    if (normalized.length < 2 || !key) return [];

    const url = new URL(`${API_ORIGIN}/v1.1/Games/ByGameName`);
    url.searchParams.set("apikey", key);
    url.searchParams.set("name", normalized);
    url.searchParams.set("mode", "natural");
    url.searchParams.set("include", "boxart,platform");
    const response = await net.fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error("TheGamesDB rechazo la API key o se alcanzo su cuota.");
    }
    if (!response.ok) {
      throw new Error(`TheGamesDB respondio con HTTP ${response.status}.`);
    }
    return parseTheGamesDbResults(await response.json());
  }
}
