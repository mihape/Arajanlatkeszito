const { contextBridge, ipcRenderer } = require("electron");
const { PDF_CHANNELS } = require("../shared/storage-contract");

contextBridge.exposeInMainWorld("nyilaszaroApp", {
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getMode: () => ipcRenderer.invoke("app:get-mode"),
  data: {
    getStatus: () => ipcRenderer.invoke("data:get-status"),
    loadState: () => ipcRenderer.invoke("data:load-state"),
    saveState: (state) => ipcRenderer.invoke("data:save-state", state),
    importState: (state) => ipcRenderer.invoke("data:import-state", state),
    exportState: () => ipcRenderer.invoke("data:export-state"),
    upsertCustomer: (customer) => ipcRenderer.invoke("data:upsert-customer", customer),
    deleteCustomer: (id) => ipcRenderer.invoke("data:delete-customer", id),
    upsertQuote: (quote) => ipcRenderer.invoke("data:upsert-quote", quote),
    deleteQuote: (id) => ipcRenderer.invoke("data:delete-quote", id),
    upsertCompleteQuote: (quote) => ipcRenderer.invoke("data:upsert-complete-quote", quote),
    deleteCompleteQuote: (id) => ipcRenderer.invoke("data:delete-complete-quote", id),
    upsertCompleteCategory: (category) => ipcRenderer.invoke("data:upsert-complete-category", category),
    archiveCompleteCategory: (id) => ipcRenderer.invoke("data:archive-complete-category", id),
    upsertCompleteTemplate: (template) => ipcRenderer.invoke("data:upsert-complete-template", template),
    archiveCompleteTemplate: (id) => ipcRenderer.invoke("data:archive-complete-template", id)
  },
  pdf: {
    exportQuote: (options) => ipcRenderer.invoke(PDF_CHANNELS.EXPORT_QUOTE, options),
    exportCompleteQuote: (options) => ipcRenderer.invoke(PDF_CHANNELS.EXPORT_COMPLETE_QUOTE, options)
  }
});
