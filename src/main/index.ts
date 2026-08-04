import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { JsonGameRepository } from "../domain/storage";
import { createReadErrorResult, parseTextFile } from "../domain/importer";
import { createExportResult } from "../domain/exporter";
import type { Locale, RendererErrorReport } from "../shared/api";
import type {
  ExportFormat,
  GameDraft,
  ImportBatch,
  ImportResult,
} from "../domain/types";
import { FileLogger, fileBasename, type LogEntry, type MainLogger } from "./logger";
import { isAppSettings, isLocale, SettingsStore } from "./settings";
import { resetApplicationData } from "./reset";

let mainWindow: BrowserWindow | null = null;
let repository: JsonGameRepository;
let settingsStore: SettingsStore;
let logger: MainLogger | null = null;
const pendingBatches = new Map<string, ImportBatch>();
const APPLICATION_DIRECTORY = "DakosGameTracker";

function resolveSystemLocale(value: string): "es" | "en" | "ja" {
  const language = value.toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : "es";
}

const dialogText: Record<Locale, Record<string, string>> = {
  es: {
    importFiles: "Importar historicos TXT",
    chooseFolder: "Elegir carpeta de historicos",
    exportLibrary: "Exportar biblioteca",
    textFiles: "Ficheros de texto",
    textFile: "Fichero de texto",
  },
  en: {
    importFiles: "Import historical TXT files",
    chooseFolder: "Choose historical folder",
    exportLibrary: "Export library",
    textFiles: "Text files",
    textFile: "Text file",
  },
  ja: {
    importFiles: "履歴TXTをインポート",
    chooseFolder: "履歴フォルダーを選択",
    exportLibrary: "ライブラリをエクスポート",
    textFiles: "テキストファイル",
    textFile: "テキストファイル",
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
    const content = await readFile(filePath, "utf8");
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
        "El lote mezcla modelos de valoracion; cada fila conserva el modo de su fichero de origen.",
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
    filters: [{ name: text.textFiles, extensions: ["txt"] }],
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
      (entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"),
    )
    .map((entry) => join(folder, entry.name))
    .sort((left, right) => left.localeCompare(right));
  return files.length === 0 ? makeBatch([]) : makeBatch(files);
}

function isExportFormat(value: unknown): value is ExportFormat {
  return (
    value === "legacy-2021" ||
    value === "semicolon-score" ||
    value === "semicolon-recommendation"
  );
}

async function exportLibrary(format: ExportFormat) {
  const state = await repository.load();
  const text = await getDialogText();
  const suffix =
    format === "legacy-2021"
      ? "legacy-2021"
      : format === "semicolon-score"
        ? "score"
        : "recommendation";
  const result = await dialog.showSaveDialog(mainWindow!, {
    title: text.exportLibrary,
    defaultPath: join(
      app.getPath("documents"),
      `digital-game-tracker-${suffix}.txt`,
    ),
    filters: [{ name: text.textFile, extensions: ["txt"] }],
  });
  if (result.canceled || !result.filePath) return null;

  const exportResult = createExportResult(result.filePath, format, state.games);
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
    async (event, batchId: string, allowDuplicates: boolean) => {
      assertTrustedSender(event);
      return withLoggedFailure("import:commit", async () => {
        const batch = pendingBatches.get(batchId);
        if (!batch)
          throw new Error(
            "La previsualizacion de importacion ya no esta disponible.",
          );
        const result = await repository.commitImport(
          batch,
          Boolean(allowDuplicates),
        );
        pendingBatches.delete(batchId);
        return result;
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

  ipcMain.handle("game:delete", async (event, ids: string[]) => {
    assertTrustedSender(event);
    return withLoggedFailure("game:delete", () => repository.deleteGames(ids));
  });

  ipcMain.handle("export:library", async (event, format: unknown) => {
    assertTrustedSender(event);
    return withLoggedFailure("export:library", async () => {
      if (!isExportFormat(format))
        throw new Error("Formato de exportacion no valido.");
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
      if (!isAppSettings(settings))
        throw new Error("Configuracion no valida.");
      return settingsStore.save(settings);
    });
  });

  ipcMain.handle("app:reset", async (event) => {
    assertTrustedSender(event);
    return withLoggedFailure("app:reset", async () => {
      const result = await resetApplicationData(repository, settingsStore);
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
    minWidth: 1080,
    minHeight: 720,
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
}
