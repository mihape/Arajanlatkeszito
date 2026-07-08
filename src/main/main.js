const { app, BrowserWindow, ipcMain } = require("electron");
const fs = require("fs");
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
      const errors = validateSmokeResult(expectedMode, dom, database, {
        skipDataModeCheck: process.env.NYILASZARO_SMOKE_SKIP_DATA_MODE_CHECK === "1"
      });
      const pdf = await runPdfSmoke(window);
      const backup = await runBackupSmoke(window);
      clearTimeout(timeout);
      finishSmoke({
        ok: errors.length === 0 && (!pdf || pdf.ok) && (!backup || backup.ok),
        mode: expectedMode,
        dom,
        database: {
          engine: database.engine,
          ready: database.ready,
          path: database.path || "",
          counts: database.counts || {}
        },
        pdf,
        backup,
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

async function runPdfSmoke(window) {
  const pdfDir = process.env.NYILASZARO_SMOKE_PDF_DIR;
  if (!pdfDir) return null;

  fs.mkdirSync(pdfDir, { recursive: true });
  const modes = String(process.env.NYILASZARO_SMOKE_PDF_MODES || "customer,internal")
    .split(",")
    .map((mode) => mode.trim())
    .filter(Boolean);
  const results = [];

  for (const mode of modes) {
    const normalizedMode = mode === "internal" ? "internal" : "customer";
    const prepared = await window.webContents.executeJavaScript(`window.nyilaszaroSmoke.preparePrint(${JSON.stringify(normalizedMode)})`);
    const buffer = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      landscape: false,
      preferCSSPageSize: true
    });
    const filePath = path.join(pdfDir, `smoke-${normalizedMode}.pdf`);
    fs.writeFileSync(filePath, buffer);
    results.push({
      mode: normalizedMode,
      path: filePath,
      bytes: buffer.length,
      prepared
    });
  }

  const errors = results.flatMap((result) => {
    const resultErrors = [];
    if (result.bytes < 1000) resultErrors.push(`${result.mode} PDF was too small.`);
    if (!result.prepared.hasPrintSheet) resultErrors.push(`${result.mode} print sheet was not rendered.`);
    if (!result.prepared.hasQuoteNumber) resultErrors.push(`${result.mode} print sheet did not include the demo quote number.`);
    if (!result.prepared.hasGrossTotal) resultErrors.push(`${result.mode} print sheet did not include gross total text.`);
    return resultErrors;
  });

  await window.webContents.executeJavaScript(`(() => {
    document.body.classList.remove("print-internal", "print-customer");
    window.nyilaszaroSmoke.preparePrint("customer");
  })()`);

  return {
    ok: errors.length === 0,
    dir: pdfDir,
    results,
    errors
  };
}

async function runBackupSmoke(window) {
  const backupMode = process.env.NYILASZARO_SMOKE_BACKUP_MODE;
  if (!backupMode) return null;

  if (!dataAdapter?.saveState || !dataAdapter?.exportState || !dataAdapter?.importState || !dataAdapter?.loadState) {
    return { ok: false, mode: backupMode, errors: ["Data adapter is not available."] };
  }

  const backupDate = "2026-07-08";
  const baseState = {
    settings: { companyName: "Smoke Teszt Ceg" },
    customers: [{ id: "smoke-customer", name: "Smoke Teszt Kft.", email: "smoke@example.invalid" }],
    catalog: {
      profiles: [],
      exteriorOpenings: [],
      matrices: {},
      colors: [],
      glasses: [],
      extensions: [],
      accessories: [],
      interiorDoors: { manufacturers: [], models: [], colors: [], frames: [], handles: [], locks: [] }
    },
    openingImages: {},
    quotes: [{
      id: "smoke-quote",
      number: "SMOKE-BACKUP-001",
      customerId: "smoke-customer",
      status: "Vazlat",
      createdAt: backupDate,
      updatedAt: backupDate,
      version: 1,
      statusHistory: [{ status: "Vazlat", at: backupDate, note: "Backup smoke" }],
      margin: 0,
      vat: 27,
      items: []
    }]
  };

  if (backupMode === "write") {
    const save = dataAdapter.saveState(baseState);
    const exported = dataAdapter.exportState();
    const imported = dataAdapter.importState(createSmokeImportedState(baseState, backupDate));
    const loaded = dataAdapter.loadState();
    const errors = [];
    if (!save?.ok) errors.push("Initial backup smoke save failed.");
    if (!exported?.state?.customers?.some((customer) => customer.id === "smoke-customer")) errors.push("Export did not include the saved smoke customer.");
    if (!imported?.ok) errors.push("Backup smoke import failed.");
    if (!hasImportedSmokeBackup(loaded?.state)) errors.push("Imported backup state was not loaded after import.");
    return {
      ok: errors.length === 0,
      mode: "write",
      exportedCustomerCount: exported?.state?.customers?.length || 0,
      loadedCustomerCount: loaded?.state?.customers?.length || 0,
      loadedQuoteCount: loaded?.state?.quotes?.length || 0,
      errors
    };
  }

  const loaded = dataAdapter.loadState();
  const exported = dataAdapter.exportState();
  const errors = [];
  if (!hasImportedSmokeBackup(loaded?.state)) errors.push("Imported backup state did not survive restart.");
  if (!hasImportedSmokeBackup(exported?.state)) errors.push("Exported backup state after restart is missing imported rows.");
  return {
    ok: errors.length === 0,
    mode: "verify",
    loadedCustomerCount: loaded?.state?.customers?.length || 0,
    loadedQuoteCount: loaded?.state?.quotes?.length || 0,
    exportedCustomerCount: exported?.state?.customers?.length || 0,
    errors
  };
}

function createSmokeImportedState(baseState, backupDate) {
  return {
    ...baseState,
    settings: { ...baseState.settings, companyName: "Smoke Importalt Ceg" },
    customers: [
      ...baseState.customers,
      { id: "smoke-imported-customer", name: "Smoke Importalt Kft.", email: "smoke-import@example.invalid" }
    ],
    quotes: [
      ...baseState.quotes,
      {
        id: "smoke-imported-quote",
        number: "SMOKE-BACKUP-002",
        customerId: "smoke-imported-customer",
        status: "Elfogadva",
        createdAt: backupDate,
        updatedAt: backupDate,
        version: 1,
        statusHistory: [{ status: "Elfogadva", at: backupDate, note: "Imported backup smoke" }],
        margin: 0,
        vat: 27,
        items: []
      }
    ]
  };
}

function hasImportedSmokeBackup(candidateState) {
  const customers = candidateState?.customers || [];
  const quotes = candidateState?.quotes || [];
  return customers.some((customer) => customer.id === "smoke-imported-customer")
    && quotes.some((quote) => quote.id === "smoke-imported-quote");
}

function validateSmokeResult(expectedMode, dom, database, options = {}) {
  const errors = [];
  if (!dom.hasDashboard) errors.push("Dashboard heading was not rendered.");
  if (!database.ready) errors.push("SQLite adapter is not ready.");
  if (!database.path) errors.push("SQLite database path is missing.");
  if (options.skipDataModeCheck) return errors;

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
