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

  ipcMain.handle(PDF_CHANNELS.EXPORT_COMPLETE_QUOTE, async (event, options = {}) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return { ok: false, reason: "window-not-found" };
    return exportWindowToPdf(window, dialog, {
      ...options,
      kind: "complete",
      defaultDirectory: app.getPath("documents")
    });
  });
}

async function exportWindowToPdf(window, dialog, options = {}) {
  const defaultPath = buildPdfDefaultPath(options);
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: options.kind === "complete" ? "Komplett ajánlat PDF mentése" : options.mode === "internal" ? "Belső PDF mentése" : "Ügyfél PDF mentése",
    defaultPath,
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });

  if (canceled || !filePath) return { ok: false, canceled: true };

  const pdfBuffer = await window.webContents.printToPDF({
    printBackground: true,
    pageSize: "A4",
    landscape: false,
    preferCSSPageSize: true,
    displayHeaderFooter: options.kind === "complete",
    headerTemplate: "<span></span>",
    footerTemplate: options.kind === "complete" ? completeQuoteFooter(options.quoteNumber) : "<span></span>"
  });
  fs.writeFileSync(filePath, pdfBuffer);
  return { ok: true, path: filePath, bytes: pdfBuffer.length };
}

function buildPdfDefaultPath(options = {}) {
  if (options.kind === "complete") {
    const quoteNumber = sanitizePdfFileName(options.quoteNumber || "komplett-ajanlat");
    const style = options.style === "classic" ? "classic" : "modern";
    return path.join(options.defaultDirectory || process.cwd(), `${quoteNumber}-komplett-${style}.pdf`);
  }
  const suffix = options.mode === "internal" ? "belso" : "ugyfel";
  const quoteNumber = sanitizePdfFileName(options.quoteNumber || "ajanlat");
  return path.join(options.defaultDirectory || process.cwd(), `${quoteNumber}-${suffix}.pdf`);
}

function completeQuoteFooter(quoteNumber) {
  const safeNumber = sanitizePdfFileName(quoteNumber || "komplett-ajanlat");
  return `<div style="width:100%; padding:0 12mm; font-size:8px; color:#555; display:flex; justify-content:space-between;"><span>${safeNumber}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
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
  sanitizePdfFileName,
  completeQuoteFooter
};
