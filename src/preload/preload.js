const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nyilaszaroApp", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getMode: () => ipcRenderer.invoke("app:get-mode"),
  data: {
    getStatus: () => ipcRenderer.invoke("data:get-status")
  }
});
