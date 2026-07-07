const BLOCKED_MARKERS = new Set(["x", "nem", "tilt", "blocked", "-", "n/a"]);

function parseMatrixImport(text, matrix) {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const report = {
    ok: false,
    errors: [],
    warnings: [],
    prices: {},
    blocked: {},
    stats: {
      importedPrices: 0,
      blockedCells: 0,
      missingCells: 0,
      invalidCells: 0
    }
  };

  if (!lines.length) {
    report.errors.push("Nincs beillesztett mátrix.");
    return report;
  }

  const rows = lines.map(splitRow);
  const header = rows[0].slice(1).map(toDimension);
  const hasHeader = !toDimension(rows[0][0]) && header.some(Boolean);

  if (hasHeader) {
    if (header.some((width) => !width)) report.errors.push("A fejlécben van nem értelmezhető szélesség.");
    rows.slice(1).forEach((row, rowIndex) => {
      const height = toDimension(row[0]);
      if (!height) {
        report.errors.push(`A(z) ${rowIndex + 2}. sor magassága nem értelmezhető.`);
        return;
      }
      header.forEach((width, index) => {
        if (!width) return;
        collectCell(report, width, height, row[index + 1], rowIndex + 2, index + 2);
      });
    });
  } else {
    rows.forEach((row, rowIndex) => {
      const height = matrix.heights?.[rowIndex];
      if (!height) {
        report.warnings.push(`A(z) ${rowIndex + 1}. sor kimarad, mert nincs hozzá mátrix magasság.`);
        return;
      }
      row.forEach((cell, colIndex) => {
        const width = matrix.widths?.[colIndex];
        if (!width) {
          report.warnings.push(`A(z) ${colIndex + 1}. oszlop kimarad, mert nincs hozzá mátrix szélesség.`);
          return;
        }
        collectCell(report, width, height, cell, rowIndex + 1, colIndex + 1);
      });
    });
  }

  report.ok = report.errors.length === 0;
  return report;
}

function splitRow(line) {
  return line.split(/\t|;|,/).map((cell) => cell.trim());
}

function collectCell(report, width, height, rawCell, rowNumber, columnNumber) {
  const key = `${width}x${height}`;
  const cell = String(rawCell ?? "").trim();
  if (!cell) {
    report.stats.missingCells += 1;
    report.errors.push(`Hiányzó cella: ${key} (${rowNumber}. sor, ${columnNumber}. oszlop).`);
    return;
  }

  if (BLOCKED_MARKERS.has(cell.toLowerCase())) {
    report.blocked[key] = true;
    report.stats.blockedCells += 1;
    return;
  }

  const price = toPrice(cell);
  if (!Number.isFinite(price) || price < 0) {
    report.stats.invalidCells += 1;
    report.errors.push(`Hibás ár: ${key} = "${cell}" (${rowNumber}. sor, ${columnNumber}. oszlop).`);
    return;
  }

  report.prices[key] = price;
  report.blocked[key] = false;
  report.stats.importedPrices += 1;
}

function toDimension(value) {
  const number = Number(String(value || "").replace(/\s/g, ""));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function toPrice(value) {
  const normalized = String(value || "")
    .replace(/\s/g, "")
    .replace(/\u00a0/g, "")
    .replace(/Ft$/i, "");
  return Number(normalized);
}

if (typeof globalThis !== "undefined") {
  globalThis.NyilaszaroMatrixImport = {
    parseMatrixImport,
    BLOCKED_MARKERS
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    parseMatrixImport,
    BLOCKED_MARKERS
  };
}
