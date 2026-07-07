const assert = require("assert");
const { parseMatrixImport } = require("../src/shared/matrix-import");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("matrix import parses header-based price and blocked cells", () => {
  const report = parseMatrixImport(";1000;1100\n1200;50000;NEM", {});

  assert.equal(report.ok, true);
  assert.equal(report.prices["1000x1200"], 50000);
  assert.equal(report.blocked["1100x1200"], true);
  assert.equal(report.stats.importedPrices, 1);
  assert.equal(report.stats.blockedCells, 1);
});

test("matrix import reports missing and invalid cells before saving", () => {
  const report = parseMatrixImport(";1000;1100\n1200;;abc", {});

  assert.equal(report.ok, false);
  assert.equal(report.stats.missingCells, 1);
  assert.equal(report.stats.invalidCells, 1);
  assert(report.errors.some((error) => error.includes("Hiányzó cella")));
  assert(report.errors.some((error) => error.includes("Hibás ár")));
});

test("matrix import supports no-header paste using existing matrix dimensions", () => {
  const report = parseMatrixImport("100;200\n300;x", {
    widths: [800, 900],
    heights: [1000, 1100]
  });

  assert.equal(report.ok, true);
  assert.equal(report.prices["800x1000"], 100);
  assert.equal(report.prices["900x1000"], 200);
  assert.equal(report.prices["800x1100"], 300);
  assert.equal(report.blocked["900x1100"], true);
});
