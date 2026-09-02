const assert = require("assert");
const completeQuote = require("../src/shared/complete-quote-calculations");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("complete quote line totals round material and labor independently", () => {
  const totals = completeQuote.calculateItem({ quantity: 3.333, materialUnitNet: 1250, laborUnitNet: 800 });
  assert.equal(totals.material, 4166);
  assert.equal(totals.labor, 2666);
});

test("complete quote summary keeps incidental costs and VAT separate", () => {
  const summary = completeQuote.summarizeQuote({
    vat: 27,
    sections: [
      { kind: "regular", items: [{ quantity: 2, materialUnitNet: 1000, laborUnitNet: 500 }] },
      { kind: "incidental", items: [{ quantity: 1, materialUnitNet: 0, laborUnitNet: 10000 }] }
    ]
  });
  assert.equal(summary.material, 2000);
  assert.equal(summary.labor, 11000);
  assert.equal(summary.incidentalLabor, 10000);
  assert.equal(summary.net, 13000);
  assert.equal(summary.vatAmount, 3510);
  assert.equal(summary.gross, 16510);
});

test("complete quote supports FAD and explicit zero-priced warnings", () => {
  const quote = {
    customerId: "customer-1",
    projectAddress: "Teszt utca 1.",
    workDescription: "Teszt munka",
    vat: "FAD",
    sections: [{ name: "Szigetelés", items: [{ description: "EPS rendszer", quantity: 1, unit: "m²", materialUnitNet: 0, laborUnitNet: 0 }] }]
  };
  assert.equal(completeQuote.summarizeQuote(quote).vatAmount, 0);
  const validation = completeQuote.validateQuote(quote);
  assert.equal(validation.ready, true);
  assert.equal(validation.warnings.length, 1);
});

test("complete quote number follows the highest current-year TZG sequence", () => {
  const quotes = [
    { number: "TZG-2026-0001" },
    { number: "TZG-2026-0008" },
    { number: "TZG-2025-9999" },
    { number: "AJ-2026-0009" }
  ];
  assert.equal(completeQuote.nextNumber(quotes, 2026), "TZG-2026-0009");
  assert.equal(completeQuote.nextNumber(quotes, 2027), "TZG-2027-0001");
});

test("starter catalog covers every configured work category without commercial prices", () => {
  const catalog = completeQuote.createStarterCatalog();
  assert.equal(catalog.categories.length, 13);
  assert(catalog.itemTemplates.some((template) => template.description.includes("EPS 10 cm")));
  assert(catalog.itemTemplates.every((template) => template.materialUnitNet === 0 && template.laborUnitNet === 0));
});
