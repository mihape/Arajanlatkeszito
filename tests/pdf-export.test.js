const assert = require("assert");
const path = require("path");
const { PDF_CHANNELS } = require("../src/shared/storage-contract");
const { buildPdfDefaultPath, sanitizePdfFileName, completeQuoteFooter } = require("../src/main/pdf-export");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("PDF export uses a stable IPC channel", () => {
  assert.equal(PDF_CHANNELS.EXPORT_QUOTE, "pdf:export-quote");
  assert.equal(PDF_CHANNELS.EXPORT_COMPLETE_QUOTE, "pdf:export-complete-quote");
});

test("PDF default file names are filesystem-safe", () => {
  assert.equal(sanitizePdfFileName("AJ-2026/0001: Éva Kft."), "AJ-2026-0001-Eva-Kft");
  assert.equal(sanitizePdfFileName("   "), "ajanlat");

  const customerPath = buildPdfDefaultPath({ quoteNumber: "AJ-2026/0001", mode: "customer" });
  const internalPath = buildPdfDefaultPath({ quoteNumber: "AJ-2026/0001", mode: "internal" });

  assert.equal(path.basename(customerPath), "AJ-2026-0001-ugyfel.pdf");
  assert.equal(path.basename(internalPath), "AJ-2026-0001-belso.pdf");
});

test("complete quote PDF has a style-safe filename and numbered footer", () => {
  const classicPath = buildPdfDefaultPath({ quoteNumber: "TZG-2026-0001", kind: "complete", style: "classic" });
  const modernPath = buildPdfDefaultPath({ quoteNumber: "TZG-2026-0001", kind: "complete", style: "modern" });
  assert.equal(path.basename(classicPath), "TZG-2026-0001-komplett-classic.pdf");
  assert.equal(path.basename(modernPath), "TZG-2026-0001-komplett-modern.pdf");
  assert(completeQuoteFooter("TZG-2026-0001").includes("pageNumber"));
});
