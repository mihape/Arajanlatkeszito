const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { DATA_CHANNELS } = require("../shared/storage-contract");
const { createSqliteAdapter } = require("./database");

let dataAdapter;

function createMainWindow() {
  const appMode = getAppMode();
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    title: "Nyilaszaró Ajanlatkeszito",
    backgroundColor: "#f4f2ed",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.loadFile(path.join(__dirname, "../renderer/index.html"), {
    query: { mode: appMode }
  });
}

app.whenReady().then(() => {
  dataAdapter = createSqliteAdapter({ dataDir: app.getPath("userData") });
  ipcMain.handle("app:get-version", () => app.getVersion());
  ipcMain.handle("app:get-mode", () => getAppMode());
  ipcMain.handle(DATA_CHANNELS.GET_STATUS, () => dataAdapter.getStatus());
  ipcMain.handle(DATA_CHANNELS.LOAD_STATE, () => dataAdapter.loadState());
  ipcMain.handle(DATA_CHANNELS.SAVE_STATE, (_event, state) => dataAdapter.saveState(state));
  ipcMain.handle(DATA_CHANNELS.IMPORT_STATE, (_event, state) => dataAdapter.importState(state));
  ipcMain.handle(DATA_CHANNELS.EXPORT_STATE, () => dataAdapter.exportState());
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

function getAppMode() {
  const requestedMode = process.env.NYILASZARO_APP_MODE;
  if (requestedMode === "demo" || requestedMode === "release") return requestedMode;
  return app.isPackaged ? "release" : "demo";
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
