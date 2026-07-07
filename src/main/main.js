const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { DATA_CHANNELS } = require("../shared/storage-contract");
const { createSqliteAdapter } = require("./database");
const { registerPdfHandlers } = require("./pdf-export");

let dataAdapter;

if (process.env.NYILASZARO_USER_DATA_DIR) {
  app.setPath("userData", process.env.NYILASZARO_USER_DATA_DIR);
}

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

  if (process.env.NYILASZARO_SMOKE === "1") {
    attachSmokeCheck(window, appMode);
  }

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
  ipcMain.handle(DATA_CHANNELS.UPSERT_CUSTOMER, (_event, customer) => dataAdapter.upsertCustomer(customer));
  ipcMain.handle(DATA_CHANNELS.DELETE_CUSTOMER, (_event, id) => dataAdapter.deleteCustomer(id));
  ipcMain.handle(DATA_CHANNELS.UPSERT_QUOTE, (_event, quote) => dataAdapter.upsertQuote(quote));
  ipcMain.handle(DATA_CHANNELS.DELETE_QUOTE, (_event, id) => dataAdapter.deleteQuote(id));
  registerPdfHandlers();
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

function attachSmokeCheck(window, appMode) {
  const expectedMode = process.env.NYILASZARO_SMOKE_EXPECT || appMode;
  const timeout = setTimeout(() => {
    finishSmoke({
      ok: false,
      mode: expectedMode,
      error: "Renderer did not finish loading before the smoke timeout."
    });
  }, Number(process.env.NYILASZARO_SMOKE_TIMEOUT_MS || 20000));

  window.webContents.once("did-fail-load", (_event, errorCode, errorDescription) => {
    clearTimeout(timeout);
    finishSmoke({
      ok: false,
      mode: expectedMode,
      error: `Renderer failed to load: ${errorCode} ${errorDescription}`
    });
  });

  window.webContents.once("did-finish-load", async () => {
    try {
      const dom = await window.webContents.executeJavaScript(`(() => {
        const text = document.body ? document.body.innerText : "";
        return {
          title: document.title,
          hasDashboard: text.includes("Ajánlatok dashboard"),
          hasEmptyQuoteState: text.includes("Még nincs ajánlat."),
          hasDemoCustomer: text.includes("Demo Partner Kft."),
          hasDemoQuote: text.includes("AJ-2026-0001"),
          quoteCountZero: text.includes("0 db"),
          quoteCountOne: text.includes("1 db")
        };
      })()`);
      const database = dataAdapter.getStatus();
      const errors = validateSmokeResult(expectedMode, dom, database);
      clearTimeout(timeout);
      finishSmoke({
        ok: errors.length === 0,
        mode: expectedMode,
        dom,
        database: {
          engine: database.engine,
          ready: database.ready,
          path: database.path || "",
          counts: database.counts || {}
        },
        errors
      });
    } catch (error) {
      clearTimeout(timeout);
      finishSmoke({
        ok: false,
        mode: expectedMode,
        error: error?.message || String(error)
      });
    }
  });
}

function validateSmokeResult(expectedMode, dom, database) {
  const errors = [];
  if (!dom.hasDashboard) errors.push("Dashboard heading was not rendered.");
  if (!database.ready) errors.push("SQLite adapter is not ready.");
  if (!database.path) errors.push("SQLite database path is missing.");

  if (expectedMode === "release") {
    if (!dom.hasEmptyQuoteState) errors.push("Release mode did not render the empty quote state.");
    if (dom.hasDemoCustomer) errors.push("Release mode rendered Demo Partner Kft.");
    if (dom.hasDemoQuote) errors.push("Release mode rendered AJ-2026-0001.");
  }

  if (expectedMode === "demo") {
    if (!dom.hasDemoCustomer) errors.push("Demo mode did not render Demo Partner Kft.");
    if (!dom.hasDemoQuote) errors.push("Demo mode did not render AJ-2026-0001.");
  }

  return errors;
}

function finishSmoke(report) {
  console.log(`NYILASZARO_ELECTRON_SMOKE_RESULT ${JSON.stringify(report)}`);
  app.exit(report.ok ? 0 : 1);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
