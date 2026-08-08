import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { extname, join } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { JsonGameRepository } from "../domain/storage";
import { createReadErrorResult, parseTextFile } from "../domain/importer";
import { createExportResult } from "../domain/exporter";
import { createNeoCsvExportResult, parseNeoCsvFile } from "../domain/neo";
import type {
  ApiExportFormat,
  CoverSearchResult,
  Locale,
  RendererErrorReport,
} from "../shared/api";
import type {
  CoverImportSummary,
  GameCover,
  GameDraft,
  ImportBatch,
  ImportCoverResolver,
  ImportResult,
  ParsedGame,
} from "../domain/types";
import { createImportRowKey } from "../domain/review";
import { FileLogger, fileBasename, type LogEntry, type MainLogger } from "./logger";
import { isAppSettingsInput, isLocale, SettingsStore } from "./settings";
import { resetApplicationData } from "./reset";
import { assertExportAllowed, isExportFormat } from "./export-policy";
import { CoverStore } from "./cover-store";
import {
  CoverSearchCache,
  normalizeCoverSearchQuery,
  type CoverSearchCacheScope,
} from "./cover-search-cache";
import { HltbCoverProvider } from "./hltb-provider";
import { TheGamesDbProvider } from "./thegamesdb-provider";
import { parseNeoWorkbookFile, writeNeoWorkbook } from "./neo-excel";

let mainWindow: BrowserWindow | null = null;
let repository: JsonGameRepository;
let settingsStore: SettingsStore;
let logger: MainLogger | null = null;
let coverStore: CoverStore;
let coverSearchCache: CoverSearchCache;
let hltbCoverProvider: HltbCoverProvider;
let theGamesDbProvider: TheGamesDbProvider;
const pendingBatches = new Map<string, ImportBatch>();
const APPLICATION_DIRECTORY = "DakosGameTracker";

function resolveSystemLocale(value: string): "es" | "en" | "ja" {
  const language = value.toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : "es";
}

const dialogText: Record<Locale, Record<string, string>> = {
  es: {
    importFiles: "Importar archivos históricos y Neo",
    chooseFolder: "Elegir carpeta de importación",
    neoImportFiles: "Importar tabla Neo",
    neoChooseFolder: "Elegir carpeta de tablas Neo",
    exportLibrary: "Exportar biblioteca",
    textFiles: "Ficheros compatibles",
    textFile: "Fichero de texto",
    neoFiles: "Ficheros de tabla Neo",
    neoFile: "Fichero de tabla Neo",
    coverFile: "Fichero de imagen",
  },
  en: {
    importFiles: "Import historical and Neo files",
    chooseFolder: "Choose import folder",
    neoImportFiles: "Import Neo table",
    neoChooseFolder: "Choose Neo table folder",
    exportLibrary: "Export library",
    textFiles: "Compatible files",
    textFile: "Text file",
    neoFiles: "Neo table files",
    neoFile: "Neo table file",
    coverFile: "Image file",
  },
  ja: {
    importFiles: "履歴とNeoファイルをインポート",
    chooseFolder: "インポートフォルダーを選択",
    neoImportFiles: "Neoテーブルをインポート",
    neoChooseFolder: "Neoテーブルフォルダーを選択",
    exportLibrary: "ライブラリをエクスポート",
    textFiles: "対応ファイル",
    textFile: "テキストファイル",
    neoFiles: "Neoテーブルファイル",
    neoFile: "Neoテーブルファイル",
    coverFile: "画像ファイル",
  },
};

async function getDialogText(): Promise<Record<string, string>> {
  const settings = await settingsStore.load();
  return dialogText[settings.locale];
}

function isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
  const senderUrl = event.senderFrame?.url ?? "";
  if (app.isPackaged) return senderUrl.startsWith("file://");
  const devUrl = process.env.ELECTRON_RENDERER_URL ?? "";
  return (
    (devUrl.length > 0 && senderUrl.startsWith(devUrl)) ||
    senderUrl.startsWith("http://localhost:") ||
    senderUrl.startsWith("http://127.0.0.1:")
  );
}

function assertTrustedSender(event: Electron.IpcMainInvokeEvent): void {
  if (!isTrustedSender(event)) throw new Error("Origen IPC no autorizado.");
}

function getMainLogger(): MainLogger | null {
  if (logger) return logger;
  try {
    logger = new FileLogger(
      join(
        app.getPath("appData"),
        APPLICATION_DIRECTORY,
        "logs",
        "app.log",
      ),
    );
    return logger;
  } catch {
    return null;
  }
}

function safeLog(entry: LogEntry): Promise<void> {
  try {
    const mainLogger = getMainLogger();
    return mainLogger
      ? mainLogger.log(entry).catch(() => undefined)
      : Promise.resolve();
  } catch {
    return Promise.resolve();
  }
}

function describeError(error: unknown): {
  message: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || "Error desconocido.",
      stack: error.stack,
    };
  }
  if (typeof error === "string") return { message: error };
  return { message: "Se produjo un error no identificado." };
}

async function withLoggedFailure<T>(
  operation: string,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    const details = describeError(error);
    await safeLog({
      level: "error",
      process: "main",
      operation,
      message: details.message,
      stack: details.stack,
    });
    throw error;
  }
}

function isRendererErrorReport(value: unknown): value is RendererErrorReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<RendererErrorReport>;
  return (
    typeof report.operation === "string" &&
    report.operation.length > 0 &&
    report.operation.length <= 120 &&
    typeof report.message === "string" &&
    report.message.length > 0 &&
    report.message.length <= 4_000 &&
    (report.stack === undefined ||
      (typeof report.stack === "string" && report.stack.length <= 20_000))
  );
}

function registerProcessErrorHandlers(): void {
  process.on("uncaughtException", (error) => {
    const details = describeError(error);
    void safeLog({
      level: "error",
      process: "main",
      operation: "process:uncaught-exception",
      message: details.message,
      stack: details.stack,
    });
  });

  process.on("unhandledRejection", (reason) => {
    const details = describeError(reason);
    void safeLog({
      level: "error",
      process: "main",
      operation: "process:unhandled-rejection",
      message: details.message,
      stack: details.stack,
    });
  });
}

async function readAndParseFile(filePath: string): Promise<ImportResult> {
  try {
    const extension = extname(filePath).toLowerCase();
    if (extension === ".xlsx") return await parseNeoWorkbookFile(filePath);
    const content = await readFile(filePath, "utf8");
    if (extension === ".csv") return parseNeoCsvFile(filePath, content);
    const result = parseTextFile(filePath, content);
    if (content.includes("\uFFFD")) {
      result.warnings.push({
        line: 0,
        severity: "warning",
        code: "encoding-replacement",
        message:
          "El archivo contiene caracteres que no pudieron decodificarse como UTF-8.",
      });
    }
    return result;
  } catch (error) {
    const details = describeError(error);
    await safeLog({
      level: "error",
      process: "main",
      operation: "import:read",
      message: `No se pudo leer ${fileBasename(filePath)}: ${details.message}`,
      stack: details.stack,
    });
    const message = details.message || "No se pudo leer el fichero.";
    return createReadErrorResult(filePath, message);
  }
}

async function makeBatch(filePaths: string[]): Promise<ImportBatch> {
  const files = await Promise.all(
    filePaths.map((filePath) => readAndParseFile(filePath)),
  );
  const ratingFormats = new Set(
    files
      .map((file) => file.format)
      .filter((format) => format !== "unknown"),
  );
  if (ratingFormats.size > 1 && files.length > 0) {
    files[0].warnings.push({
      line: 0,
      severity: "warning",
      code: "mixed-rating-batch",
      message:
        "El lote mezcla modelos de valoración; cada fila conserva el modo de su fichero de origen.",
    });
  }
  const batch: ImportBatch = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    files,
  };
  pendingBatches.set(batch.id, batch);
  return batch;
}

async function chooseFiles(): Promise<ImportBatch | null> {
  const text = await getDialogText();
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: text.importFiles,
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: text.textFiles,
        extensions: ["txt", "xlsx", "csv"],
      },
    ],
  });
  return result.canceled || result.filePaths.length === 0
    ? null
    : makeBatch(result.filePaths);
}

async function chooseFolder(): Promise<ImportBatch | null> {
  const text = await getDialogText();
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: text.chooseFolder,
    properties: ["openDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;

  const folder = result.filePaths[0];
  const entries = await readdir(folder, { withFileTypes: true });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        [".txt", ".xlsx", ".csv"].includes(extname(entry.name).toLowerCase()),
    )
    .map((entry) => join(folder, entry.name))
    .sort((left, right) => left.localeCompare(right));
  return files.length === 0 ? makeBatch([]) : makeBatch(files);
}

function isCoverSearchResult(value: unknown): value is CoverSearchResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CoverSearchResult>;
  return (
    (candidate.provider === "howlongtobeat" ||
      candidate.provider === "thegamesdb") &&
    typeof candidate.sourceId === "string" &&
    candidate.sourceId.length <= 100 &&
    typeof candidate.title === "string" &&
    candidate.title.length > 0 &&
    candidate.title.length <= 300 &&
    typeof candidate.imageUrl === "string" &&
    typeof candidate.detailUrl === "string"
  );
}

async function searchCovers(query: string): Promise<CoverSearchResult[]> {
  if (typeof query !== "string" || query.trim().length < 2 || query.length > 200) {
    return [];
  }
  const settings = await settingsStore.load();
  const cacheScope: CoverSearchCacheScope = settings.theGamesDbApiKey
    ? "thegamesdb"
    : "hltb";
  try {
    const cached = await coverSearchCache.get(query, cacheScope);
    if (cached !== undefined) {
      await safeLog({
        level: "info",
        process: "main",
        operation: "cover:search:cache-hit",
        message: `Se reutilizaron ${cached.length} candidatas para "${query.trim()}".`,
      });
      return cached;
    }
  } catch (error) {
    const details = describeError(error);
    await safeLog({
      level: "warn",
      process: "main",
      operation: "cover:search:cache-read",
      message: details.message,
      stack: details.stack,
    });
  }

  if (settings.theGamesDbApiKey) {
    try {
      const results = await theGamesDbProvider.search(
        query,
        settings.theGamesDbApiKey,
      );
      if (results.length > 0) {
        await saveCoverSearchCache(query, cacheScope, results);
        return results;
      }
      await safeLog({
        level: "warn",
        process: "main",
        operation: "cover:search:thegamesdb-empty",
        message: "TheGamesDB no devolvio candidatas; se prueba HLTB.",
      });
    } catch (error) {
      const details = describeError(error);
      await safeLog({
        level: "warn",
        process: "main",
        operation: "cover:search:thegamesdb",
        message: details.message,
        stack: details.stack,
      });
    }
  }
  const results = await hltbCoverProvider.search(query);
  await saveCoverSearchCache(query, cacheScope, results);
  return results;
}

async function saveCoverSearchCache(
  query: string,
  scope: CoverSearchCacheScope,
  results: CoverSearchResult[],
): Promise<void> {
  try {
    await coverSearchCache.set(query, scope, results);
  } catch (error) {
    const details = describeError(error);
    await safeLog({
      level: "warn",
      process: "main",
      operation: "cover:search:cache-write",
      message: details.message,
      stack: details.stack,
    });
  }
}

async function clearCoverSearchCache(): Promise<void> {
  await coverSearchCache.clear();
  await safeLog({
    level: "info",
    process: "main",
    operation: "cover:search:cache-clear",
    message: "Se borró la caché persistente de búsquedas de portadas.",
  });
}

function emptyCoverImportSummary(enabled = false): CoverImportSummary {
  return {
    enabled,
    searched: 0,
    assigned: 0,
    notFound: 0,
    failed: 0,
  };
}

async function prepareImportCoverResolver(
  batch: ImportBatch,
  reviewRowKeys: ReadonlySet<string>,
): Promise<{
  resolver: ImportCoverResolver;
  summary: CoverImportSummary;
}> {
  const summary = emptyCoverImportSummary(true);
  const candidatesByName = new Map<string, CoverSearchResult[]>();
  const rows = batch.files.flatMap((file) =>
    file.rows.filter(
      (row) =>
        !row.needsReview || reviewRowKeys.has(createImportRowKey(row.source)),
    ),
  );

  for (const row of rows) {
    const key = normalizeCoverSearchQuery(row.name);
    if (candidatesByName.has(key)) continue;
    summary.searched += 1;
    try {
      candidatesByName.set(key, await searchCovers(row.name));
    } catch (error) {
      candidatesByName.set(key, []);
      summary.failed += 1;
      const details = describeError(error);
      await safeLog({
        level: "warn",
        process: "main",
        operation: "cover:import:search",
        message: `No se pudo buscar una portada para "${row.name}": ${details.message}`,
        stack: details.stack,
      });
    }
  }

  const savedByName = new Map<string, GameCover | null>();
  const resolver: ImportCoverResolver = async (parsed: ParsedGame) => {
    const key = normalizeCoverSearchQuery(parsed.name);
    if (savedByName.has(key)) {
      const cachedCover = savedByName.get(key) ?? null;
      if (cachedCover) summary.assigned += 1;
      return cachedCover;
    }

    const candidate = candidatesByName.get(key)?.[0];
    if (!candidate) {
      savedByName.set(key, null);
      summary.notFound += 1;
      return null;
    }

    try {
      const savedCover = await coverStore.saveSearchResult(candidate);
      savedByName.set(key, savedCover);
      summary.assigned += 1;
      return savedCover;
    } catch (error) {
      savedByName.set(key, null);
      summary.failed += 1;
      const details = describeError(error);
      await safeLog({
        level: "warn",
        process: "main",
        operation: "cover:import:save",
        message: `No se pudo guardar la portada de "${parsed.name}": ${details.message}`,
        stack: details.stack,
      });
      return null;
    }
  };

  return { resolver, summary };
}

async function saveCoverFromSearch(
  result: CoverSearchResult,
): Promise<GameCover> {
  if (!isCoverSearchResult(result)) {
    throw new Error("Resultado de portada no valido.");
  }
  return coverStore.saveSearchResult(result);
}

async function readCoverPreview(result: CoverSearchResult): Promise<string> {
  if (!isCoverSearchResult(result)) {
    throw new Error("Resultado de portada no valido.");
  }
  return coverStore.readSearchPreview(result);
}

async function chooseCoverFile(): Promise<GameCover | null> {
  const text = await getDialogText();
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: text.coverFile,
    properties: ["openFile"],
    filters: [
      { name: text.coverFile, extensions: ["jpg", "jpeg", "png", "webp"] },
    ],
  });
  return result.canceled || result.filePaths.length === 0
    ? null
    : coverStore.saveLocalFile(result.filePaths[0]);
}

async function exportLibrary(format: ApiExportFormat) {
  const settings = await settingsStore.load();
  assertExportAllowed(format, settings);
  const state = await repository.load();
  const text = await getDialogText();
  const suffix =
    format === "legacy-2021"
      ? "legacy-2021"
      : format === "semicolon-score"
        ? "score"
        : format === "semicolon-recommendation"
        ? "recommendation"
        : format === "semicolon-recommendation-platform"
          ? "platform"
          : format;
  const neoExport = format === "neo-xlsx" || format === "neo-csv";
  const extension = neoExport && format === "neo-xlsx" ? "xlsx" : neoExport ? "csv" : "txt";
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: text.exportLibrary,
    defaultPath: join(
      app.getPath("documents"),
      `digital-game-tracker-${suffix}.${extension}`,
    ),
    filters: [
      {
        name: neoExport ? text.neoFile : text.textFile,
        extensions: [extension],
      },
    ],
  });
  if (result.canceled || !result.filePath) return null;

  if (format === "neo-xlsx") {
    await writeNeoWorkbook(result.filePath, state.games);
    const summary = createNeoCsvExportResult(result.filePath, state.games);
    const { content: _content, ...withoutContent } = summary;
    return { ...withoutContent, format };
  }
  const exportResult =
    format === "neo-csv"
      ? createNeoCsvExportResult(result.filePath, state.games)
      : createExportResult(result.filePath, format, state.games);
  await writeFile(exportResult.filePath, exportResult.content, "utf8");
  const { content: _content, ...summary } = exportResult;
  return summary;
}

function registerIpc(): void {
  ipcMain.handle("library:load", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("library:load", () => repository.load());
  });

  ipcMain.handle("import:files", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("import:select-files", chooseFiles);
  });

  ipcMain.handle("import:folder", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("import:select-folder", chooseFolder);
  });

  ipcMain.handle(
    "import:commit",
    async (
      event,
      batchId: string,
      allowDuplicates: boolean,
      autoCoverImport: boolean,
      reviewRowKeys: string[],
    ) => {
      assertTrustedSender(event);
      return withLoggedFailure("import:commit", async () => {
        const batch = pendingBatches.get(batchId);
        if (!batch)
          throw new Error(
            "La previsualización de importación ya no está disponible.",
          );
        let coverImport = emptyCoverImportSummary(Boolean(autoCoverImport));
        let coverResolver: ImportCoverResolver | undefined;
        const selectedReviewRows = new Set(
          Array.isArray(reviewRowKeys) ? reviewRowKeys : [],
        );
        if (Boolean(autoCoverImport)) {
          const prepared = await prepareImportCoverResolver(
            batch,
            selectedReviewRows,
          );
          coverImport = prepared.summary;
          coverResolver = prepared.resolver;
        }
        const result = await repository.commitImport(
          batch,
          Boolean(allowDuplicates),
          coverResolver,
          [...selectedReviewRows],
        );
        pendingBatches.delete(batchId);
        return { ...result, coverImport };
      });
    },
  );

  ipcMain.handle("game:create", async (event, draft: GameDraft) => {
    assertTrustedSender(event);
    return withLoggedFailure("game:create", () => repository.createGame(draft));
  });

  ipcMain.handle("game:update", async (event, id: string, draft: GameDraft) => {
    assertTrustedSender(event);
    return withLoggedFailure("game:update", () =>
      repository.updateGame(id, draft),
    );
  });

  ipcMain.handle(
    "game:update-status",
    async (event, id: unknown, status: unknown, value: unknown) => {
      assertTrustedSender(event);
      return withLoggedFailure("game:update-status", async () => {
        if (
          typeof id !== "string" ||
          (status !== "completed" &&
            status !== "platinum" &&
            status !== "favorite") ||
          typeof value !== "boolean"
        ) {
          throw new Error("Estado de juego no válido.");
        }
        return repository.updateGameStatus(id, status, value);
      });
    },
  );

  ipcMain.handle("game:delete", async (event, ids: string[]) => {
    assertTrustedSender(event);
    return withLoggedFailure("game:delete", () => repository.deleteGames(ids));
  });

  ipcMain.handle("cover:search", async (event, query: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:search", () =>
      searchCovers(typeof query === "string" ? query : ""),
    );
  });

  ipcMain.handle("cover:save-search", async (event, result: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:save-search", () =>
      saveCoverFromSearch(result as CoverSearchResult),
    );
  });

  ipcMain.handle("cover:preview", async (event, result: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:preview", () =>
      readCoverPreview(result as CoverSearchResult),
    );
  });

  ipcMain.handle("cover:cache:clear", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:cache:clear", clearCoverSearchCache);
  });

  ipcMain.handle("cover:select-file", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:select-file", chooseCoverFile);
  });

  ipcMain.handle("cover:read", async (event, key: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("cover:read", () =>
      coverStore.readDataUrl(typeof key === "string" ? key : ""),
    );
  });

  ipcMain.handle("export:library", async (event, format: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("export:library", async () => {
      if (!isExportFormat(format))
        throw new Error("Formato de exportación no válido.");
      return exportLibrary(format);
    });
  });

  ipcMain.handle("settings:load", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("settings:load", () => settingsStore.load());
  });

  ipcMain.handle("settings:save", async (event, settings: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("settings:save", async () => {
      if (!isAppSettingsInput(settings))
        throw new Error("Configuración no válida.");
      return settingsStore.save(settings);
    });
  });

  ipcMain.handle("app:reset", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("app:reset", async () => {
      const result = await resetApplicationData(repository, settingsStore);
      await coverStore.clear();
      await coverSearchCache.clear();
      pendingBatches.clear();
      await safeLog({
        level: "info",
        process: "main",
        operation: "app:reset",
        message: "Biblioteca interna y preferencias restablecidas; TXT y logs conservados.",
      });
      return result;
    });
  });

  ipcMain.handle("renderer:error", async (event, report: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("renderer:error", async () => {
      if (!isRendererErrorReport(report))
        throw new Error("Informe de error de renderer no valido.");
      await safeLog({
        level: "error",
        process: "renderer",
        operation: report.operation,
        message: report.message,
        stack: report.stack,
      });
    });
  });
}

function createWindow(): void {
  const appIconPath = fileURLToPath(
    new URL("../../assets/floppy.ico", import.meta.url),
  );
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
     minWidth: 760,
     minHeight: 620,
    icon: appIconPath,
    show: false,
    backgroundColor: "#10131a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: fileURLToPath(new URL("../preload/index.cjs", import.meta.url)),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(
      fileURLToPath(new URL("../renderer/index.html", import.meta.url)),
    );
  }

  mainWindow.on("closed", () => {
    hltbCoverProvider?.dispose();
    mainWindow = null;
  });
}

registerProcessErrorHandlers();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    const userDataPath = join(app.getPath("appData"), APPLICATION_DIRECTORY);
    app.setPath("userData", userDataPath);
    logger ??= new FileLogger(join(userDataPath, "logs", "app.log"));
    repository = new JsonGameRepository(
      join(userDataPath, "library.v1.json"),
    );
    settingsStore = new SettingsStore(
      join(userDataPath, "settings.v1.json"),
      resolveSystemLocale(app.getLocale()),
    );
    coverStore = new CoverStore(join(userDataPath, "covers"));
    coverSearchCache = new CoverSearchCache(
      join(userDataPath, "cover-search-cache.v1.json"),
    );
    hltbCoverProvider = new HltbCoverProvider();
    theGamesDbProvider = new TheGamesDbProvider();
    Menu.setApplicationMenu(null);
    registerIpc();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    hltbCoverProvider?.dispose();
  });
}
