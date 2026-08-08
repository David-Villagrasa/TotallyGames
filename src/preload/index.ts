import { contextBridge, ipcRenderer } from "electron";
import type { DgtApi } from "../shared/api";

const api: DgtApi = {
  loadState: () => ipcRenderer.invoke("library:load"),
  selectImportFiles: () => ipcRenderer.invoke("import:files"),
  selectImportFolder: () => ipcRenderer.invoke("import:folder"),
  commitImport: (batchId, allowDuplicates, autoCoverImport, reviewRowKeys) =>
    ipcRenderer.invoke(
      "import:commit",
      batchId,
      allowDuplicates,
      autoCoverImport,
      reviewRowKeys,
    ),
  createGame: (draft) => ipcRenderer.invoke("game:create", draft),
  updateGame: (id, draft) =>
    ipcRenderer.invoke("game:update", id, draft),
  updateGameStatus: (id, status, value) =>
    ipcRenderer.invoke("game:update-status", id, status, value),
  deleteGames: (ids) => ipcRenderer.invoke("game:delete", ids),
  searchCovers: (query) => ipcRenderer.invoke("cover:search", query),
  saveCoverFromSearch: (result) =>
    ipcRenderer.invoke("cover:save-search", result),
  readCoverPreview: (result) => ipcRenderer.invoke("cover:preview", result),
  clearCoverSearchCache: () => ipcRenderer.invoke("cover:cache:clear"),
  selectCoverFile: () => ipcRenderer.invoke("cover:select-file"),
  readCover: (key) => ipcRenderer.invoke("cover:read", key),
  exportLibrary: (format) => ipcRenderer.invoke("export:library", format),
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  resetApplicationData: () => ipcRenderer.invoke("app:reset"),
  reportRendererError: (report) => ipcRenderer.invoke("renderer:error", report),
};

contextBridge.exposeInMainWorld("dgt", api);
