const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nyilaszaroApp", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getMode: () => ipcRenderer.invoke("app:get-mode"),
  data: {
    getStatus: () => ipcRenderer.invoke("data:get-status"),
    loadState: () => ipcRenderer.invoke("data:load-state"),
    saveState: (state) => ipcRenderer.invoke("data:save-state", state),
    importState: (state) => ipcRenderer.invoke("data:import-state", state),
    exportState: () => ipcRenderer.invoke("data:export-state")
  }
});
