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

test("starter catalog covers every configured work category with bundles and realistic pricing", () => {
  const catalog = completeQuote.createStarterCatalog();
  assert.equal(catalog.categories.length, 13);
  assert(catalog.itemTemplates.some((template) => template.description.includes("EPS 10 CM")));
  assert(catalog.itemTemplates.some((template) => template.isStarterBundle));
  assert(catalog.itemTemplates.some((template) => template.materialUnitNet > 0 || template.laborUnitNet > 0));
});

test("insulation variant generator produces professional TERC text and anchors", () => {
  const white10 = completeQuote.getInsulationVariantDescription("eps_white", 10);
  assert(white10.includes("EPS 10 CM fehér"));
  assert(white10.includes("180mm dűbel"));

  const graphite15 = completeQuote.getInsulationVariantDescription("eps_graphite", 15);
  assert(graphite15.includes("EPS 15 CM GRAFITOS"));
  assert(graphite15.includes("230mm dűbel"));

  const xps5 = completeQuote.getInsulationVariantDescription("xps", 5);
  assert(xps5.includes("5 cm XPS"));
  assert(xps5.includes("140mm dűbel") || xps5.includes("120mm dűbel") || xps5.includes("dűbel"));

  const detected = completeQuote.detectInsulationVariant(graphite15);
  assert.equal(detected.typeId, "eps_graphite");
  assert.equal(detected.thicknessCm, 15);
});

test("starter bundle creates populated line items for a category", () => {
  const catalog = completeQuote.createStarterCatalog();
  const insulationCategory = catalog.categories.find((c) => c.name === "Hőszigetelés");
  const items = completeQuote.createStarterBundleItems(insulationCategory.id, catalog);
  assert(items.length >= 5);
  assert(items.some((item) => item.description.includes("Homlokzati hőszigetelés")));
  assert(items.some((item) => item.description.includes("Lábazati indítósín")));
});

test("drywall, painting and tiling variants are detectable and applicable", () => {
  const drywall = completeQuote.detectDrywallVariant("Gipszkarton válaszfal készítése");
  assert(drywall);
  const updatedDrywall = completeQuote.applyItemVariant({ quantity: 10 }, completeQuote.DRYWALL_VARIANTS[1]);
  assert.equal(updatedDrywall.materialUnitNet, 7200);

  const painting = completeQuote.detectPaintingVariant("Beltéri falfelület festése");
  assert(painting);
  const updatedPainting = completeQuote.applyItemVariant({ quantity: 50 }, completeQuote.PAINTING_VARIANTS[2]);
  assert.equal(updatedPainting.materialUnitNet, 2400);

  const tiling = completeQuote.detectTilingVariant("Aljzatburkolat készítése beltérben");
  assert(tiling);
  const updatedTiling = completeQuote.applyItemVariant({ quantity: 20 }, completeQuote.TILING_VARIANTS[1]);
  assert.equal(updatedTiling.laborUnitNet, 18500);
});

test("section note is preserved and normalized", () => {
  const section = completeQuote.normalizeSection({
    name: "Burkolás",
    note: "szintezés után a mennyiség változhat",
    items: []
  });
  assert.equal(section.note, "szintezés után a mennyiség változhat");
});
