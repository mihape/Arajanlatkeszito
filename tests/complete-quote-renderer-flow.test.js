const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const appElement = { innerHTML: "" };
const storage = new Map();
const context = {
  console,
  Intl,
  Date,
  Math,
  Number,
  String,
  Boolean,
  JSON,
  URLSearchParams,
  setTimeout: () => 0,
  clearTimeout: () => {},
  document: {
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    getElementById: (id) => (id === "app" ? appElement : null),
    addEventListener() {}
  },
  localStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  location: { search: "?mode=demo" },
  addEventListener() {},
  print() {}
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
for (const file of ["pricing-calculations.js", "complete-quote-calculations.js", "matrix-import.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared", file), "utf8"), context);
}
vm.runInContext(fs.readFileSync(path.join(root, "src/renderer/app.js"), "utf8"), context);

(async () => {
  const result = await vm.runInContext(`(() => {
    const category = completeCatalog().categories.find((item) => item.name === "Hőszigetelés");
    const template = completeCatalog().itemTemplates.find((item) => item.categoryId === category.id);
    state.completeQuotes = [completeQuote.normalizeQuote({
      id: "flow-quote", number: "TZG-2026-0001", customerId: state.customers[0].id,
      projectAddress: "Minta utca 1.", workDescription: "Flow teszt", createdAt: "2026-08-28", validityDays: 15,
      sections: [{ id: "flow-section", categoryId: category.id, name: category.name, kind: category.kind, position: 0, items: [] }]
    })];
    ui.selectedCompleteQuoteId = "flow-quote";
    ui.selectedCompleteSectionId = "flow-section";
    ui.view = "complete-quote-editor";
    return { templateId: template.id };
  })()`, context);
  await vm.runInContext(`addCompleteTemplateItem(${JSON.stringify(result.templateId)})`, context);
  const itemId = vm.runInContext("state.completeQuotes[0].sections[0].items[0].id", context);
  assert.equal(vm.runInContext("ui.completeQuickFocus.field", context), "quantity");
  await vm.runInContext(`updateCompleteInlineItem(${JSON.stringify(itemId)}, "quantity", "12.5")`, context);
  await vm.runInContext(`updateCompleteInlineItem(${JSON.stringify(itemId)}, "materialUnitNet", "3200")`, context);
  await vm.runInContext(`updateCompleteInlineItem(${JSON.stringify(itemId)}, "laborUnitNet", "1800")`, context);
  const item = vm.runInContext("state.completeQuotes[0].sections[0].items[0]", context);
  const html = appElement.innerHTML;

  assert.equal(item.quantity, 12.5);
  assert.equal(item.materialUnitNet, 3200);
  assert.equal(item.laborUnitNet, 1800);
  assert(html.includes("data-complete-inline-item=\"quantity\""));
  assert(html.includes("Tétel hozzáadása sablonból"));
  assert(html.includes("Alapcsomag betöltése"));
  assert(!html.includes("Sablon betöltése"));

  // Test variant change
  await vm.runInContext(`changeCompleteItemVariant(${JSON.stringify(itemId)}, "eps_graphite", 15)`, context);
  const updatedItem = vm.runInContext("state.completeQuotes[0].sections[0].items[0]", context);
  assert(updatedItem.description.includes("15 CM GRAFITOS"));
  assert(updatedItem.description.includes("230mm dűbel"));

  // Test category toggle creates starter bundle automatically
  await vm.runInContext(`(() => {
    const tilingCat = completeCatalog().categories.find((c) => c.name === "Hideg- és melegburkolás");
    return toggleCompleteCategory(tilingCat.id, true);
  })()`, context);
  const tilingSection = vm.runInContext("state.completeQuotes[0].sections.find((s) => s.name === 'Hideg- és melegburkolás')", context);
  assert(tilingSection.items.length >= 3);
  assert(tilingSection.items.some((i) => i.description.includes("burkolat")));

  // Test module switching and sidebar collapse
  vm.runInContext(`handleClick({ target: { closest: (selector) => selector === '[data-action]' ? { dataset: { action: 'switch-module', module: 'construction' } } : null } })`, context);
  assert.equal(vm.runInContext("ui.activeModule", context), "construction");
  assert.equal(vm.runInContext("ui.view", context), "complete-quotes");

  vm.runInContext(`handleClick({ target: { closest: (selector) => selector === '[data-action]' ? { dataset: { action: 'toggle-sidebar' } } : null } })`, context);
  assert.equal(vm.runInContext("ui.sidebarCollapsed", context), true);
  assert(appElement.innerHTML.includes("sidebar-collapsed"));

  console.log("ok - template selection adds a row immediately, bundles auto-populate, and variants persist");
})().catch((error) => {
  console.error("not ok - complete quote quick-entry flow");
  throw error;
});
