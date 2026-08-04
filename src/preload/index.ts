import { contextBridge, ipcRenderer } from "electron";
import type { DgtApi } from "../shared/api";

const api: DgtApi = {
  loadState: () => ipcRenderer.invoke("library:load"),
  selectImportFiles: () => ipcRenderer.invoke("import:files"),
  selectImportFolder: () => ipcRenderer.invoke("import:folder"),
  commitImport: (batchId, allowDuplicates) =>
    ipcRenderer.invoke("import:commit", batchId, allowDuplicates),
  createGame: (draft) => ipcRenderer.invoke("game:create", draft),
  updateGame: (id, draft) =>
    ipcRenderer.invoke("game:update", id, draft),
  deleteGames: (ids) => ipcRenderer.invoke("game:delete", ids),
  exportLibrary: (format) => ipcRenderer.invoke("export:library", format),
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  resetApplicationData: () => ipcRenderer.invoke("app:reset"),
  reportRendererError: (report) => ipcRenderer.invoke("renderer:error", report),
};

contextBridge.exposeInMainWorld("dgt", api);
