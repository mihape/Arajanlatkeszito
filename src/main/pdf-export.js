const fs = require("fs");
const path = require("path");
const { PDF_CHANNELS } = require("../shared/storage-contract");

function registerPdfHandlers() {
  const { app, BrowserWindow, dialog, ipcMain } = require("electron");

  ipcMain.handle(PDF_CHANNELS.EXPORT_QUOTE, async (event, options = {}) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return { ok: false, reason: "window-not-found" };
    return exportWindowToPdf(window, dialog, {
      ...options,
      defaultDirectory: app.getPath("documents")
    });
  });
}

async function exportWindowToPdf(window, dialog, options = {}) {
  const defaultPath = buildPdfDefaultPath(options);
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: options.mode === "internal" ? "Belső PDF mentése" : "Ügyfél PDF mentése",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });

  if (canceled || !filePath) return { ok: false, canceled: true };

  const pdfBuffer = await window.webContents.printToPDF({
    printBackground: true,
    pageSize: "A4",
    landscape: false,
    preferCSSPageSize: true
  });
  fs.writeFileSync(filePath, pdfBuffer);
  return { ok: true, path: filePath, bytes: pdfBuffer.length };
}

function buildPdfDefaultPath(options = {}) {
  const suffix = options.mode === "internal" ? "belso" : "ugyfel";
  const quoteNumber = sanitizePdfFileName(options.quoteNumber || "ajanlat");
  return path.join(options.defaultDirectory || process.cwd(), `${quoteNumber}-${suffix}.pdf`);
}

function sanitizePdfFileName(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return normalized || "ajanlat";
}

module.exports = {
  registerPdfHandlers,
  exportWindowToPdf,
  buildPdfDefaultPath,
  sanitizePdfFileName
};
