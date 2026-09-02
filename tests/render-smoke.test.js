const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

function renderApp(search, afterRenderScript = "") {
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
      addEventListener: () => {}
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    },
    location: { search },
    addEventListener: () => {},
    print: () => {}
  };
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared/pricing-calculations.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared/complete-quote-calculations.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared/matrix-import.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/renderer/app.js"), "utf8"), context);
  if (afterRenderScript) vm.runInContext(afterRenderScript, context);
  return appElement.innerHTML;
}

test("renderer index loads shared pricing before app", () => {
  const html = fs.readFileSync(path.join(root, "src/renderer/index.html"), "utf8");
  const pricingIndex = html.indexOf("../shared/pricing-calculations.js");
  const completeQuoteIndex = html.indexOf("../shared/complete-quote-calculations.js");
  const matrixImportIndex = html.indexOf("../shared/matrix-import.js");
  const appIndex = html.indexOf("app.js");

  assert(pricingIndex > -1, "pricing module script is missing");
  assert(completeQuoteIndex > -1, "complete quote module script is missing");
  assert(matrixImportIndex > -1, "matrix import module script is missing");
  assert(appIndex > -1, "app script is missing");
  assert(pricingIndex < appIndex, "pricing module must load before app.js");
  assert(completeQuoteIndex < appIndex, "complete quote module must load before app.js");
  assert(matrixImportIndex < appIndex, "matrix import module must load before app.js");
});

test("release mode starts without demo customer or quote", () => {
  const html = renderApp("?mode=release");

  assert(html.includes("Még nincs ajánlat."));
  assert(html.includes("Első feltöltési sorrend"));
  assert(html.includes("Tiszta helyi adatbázis"));
  assert(html.includes("Ellenőrizendő mintaadat"));
  assert(html.includes("Hiányzik"));
  assert(!html.includes("Demo Partner Kft."));
  assert(!html.includes("AJ-2026-0001"));
});

test("demo mode starts with fictional demo data", () => {
  const html = renderApp("?mode=demo");

  assert(html.includes("Demo Partner Kft."));
  assert(html.includes("AJ-2026-0001"));
  assert(html.includes("Demo mód - fiktív adatok"));
});

test("quotes dashboard renders workflow filters and version metadata", () => {
  const html = renderApp("?mode=demo");

  assert(html.includes("data-dashboard-search"));
  assert(html.includes("data-dashboard-status"));
  assert(html.includes("data-dashboard-customer"));
  assert(html.includes("data-dashboard-created-from"));
  assert(html.includes("data-dashboard-deadline"));
  assert(html.includes("data-view=\"profiles\""));
  assert(html.includes("Módosítva"));
  assert(html.includes("Verzió"));
  assert(html.includes("v1"));
  assert(html.includes("Kezdő állapot"));
});

test("complete quote editor renders category selection, templates and both PDF styles", () => {
  const html = renderApp("?mode=demo", `
    (() => {
      const category = completeCatalog().categories.find((item) => item.name === "Hőszigetelés");
      state.completeQuotes = [completeQuote.normalizeQuote({
        id: "complete-render-1", number: "TZG-2026-0001", customerId: state.customers[0].id,
        projectAddress: "Budapest, Minta utca 1.", workDescription: "Homlokzat hőszigetelés", createdAt: "2026-08-28", validityDays: 15, vat: 27,
        sections: [{ id: "section-render-1", categoryId: category.id, name: category.name, kind: category.kind, position: 0, items: [{ id: "item-render-1", description: "EPS rendszer", quantity: 10.5, unit: "m²", materialUnitNet: 3000, laborUnitNet: 1500, position: 0 }] }]
      })];
      ui.selectedCompleteQuoteId = "complete-render-1";
      ui.selectedCompleteSectionId = "section-render-1";
      ui.selectedCompleteItemId = "item-render-1";
      ui.completeItemEditorOpen = true;
      ui.completeItemDraft = clone(state.completeQuotes[0].sections[0].items[0]);
      ui.view = "complete-quote-editor";
      render();
    })();
  `);

  assert(html.includes("data-complete-category-toggle"));
  assert(html.includes("data-complete-template-id"));
  assert(html.includes("EPS rendszer"));
  assert(html.includes("Classic - táblázatos"));
  assert(html.includes("Modern - TZG"));
  assert(html.includes("data-action=\"save-complete-template\""));
  assert(html.includes("data-action=\"archive-complete-template\""));
  assert(html.includes("data-action=\"move-complete-item\""));
  assert(html.includes("data-action=\"duplicate-complete-item\""));
  assert(html.includes("data-complete-inline-item=\"quantity\""));
  assert(html.includes("data-action=\"export-complete-quote\""));
});

test("plastic catalog setup renders matrix coverage overview", () => {
  const html = renderApp("?mode=release", "ui.view = 'profiles'; render();");

  assert(html.includes("Műanyag törzsadatok"));
  assert(html.includes("Mátrix lefedettség"));
  assert(html.includes("minta/ellenőrizendő"));
  assert(html.includes("Minta adat"));
  assert(html.includes("tiltott cella"));
});

test("matrix setup renders readiness metrics and import guidance", () => {
  const html = renderApp("?mode=release", "ui.view = 'matrices'; render();");

  assert(html.includes("Ármátrix előkészítés"));
  assert(html.includes("Kitöltött ár"));
  assert(html.includes("Nem gyártható"));
  assert(html.includes("Kitöltött mátrix"));
  assert(html.includes("Nem gyártható cellához írhatsz X, NEM vagy TILT értéket."));
});

test("extras setup renders grouped accessory and installation overview", () => {
  const html = renderApp("?mode=release", "ui.view = 'extras'; render();");

  assert(html.includes("Kiegészítők és beépítés"));
  assert(html.includes("Szín / üveg / toktoldó"));
  assert(html.includes("Redőny / szúnyogháló"));
  assert(html.includes("Kívül színes / kívül-belül színes külön felár"));
  assert(html.includes("Fix, szélesség, kerület vagy felület alapú árazás"));
});

test("interior door setup renders custom and standard catalog overview", () => {
  const html = renderApp("?mode=release", "ui.view = 'interior'; render();");

  assert(html.includes("Beltéri ajtó törzsadatok"));
  assert(html.includes("Egyedi és standard ajtók külön logikával"));
  assert(html.includes("egyedi gyártó"));
  assert(html.includes("standard gyártó"));
  assert(html.includes("modell-szín kép"));
});

test("quote editor renders overview and active item cues", () => {
  const html = renderApp("?mode=demo", "ui.view = 'quote-editor'; ui.selectedItemId = state.quotes[0].items[0].id; ui.itemDraft = normalizeItem(state.quotes[0].items[0]); render();");

  assert(html.includes("quote-overview"));
  assert(html.includes("Prezentációs előnézet"));
  assert(html.includes("Beszerzési ár nélkül"));
  assert(html.includes("Biztonságos ügyfél PDF"));
  assert(html.includes("Belső PDF beszerzéssel"));
  assert(html.includes("Export ellenőrzés"));
  assert(html.includes("Konfigurálási lépések"));
  assert(html.includes("Profil és méret"));
  assert(html.includes("Árazási alap"));
  assert(html.includes("Generált szerkezeti rajz"));
  assert(html.includes("Fizetendő bruttó"));
  assert(html.includes("data-bind-item=\"sectionId\""));
  assert(html.includes("data-bind-item=\"room\""));
  assert(html.includes("data-bind-item=\"position\""));
  assert(html.includes("data-bind-item=\"openingDirection\""));
  assert(html.includes("Ügyfél nézet"));
  assert(html.includes("Aktív"));
  assert(html.includes("Szerkesztés alatt"));
});

test("customer presentation mode renders customer-safe quote view", () => {
  const html = renderApp("?mode=demo", "ui.view = 'quote-editor'; ui.customerPresentationMode = true; render();");

  assert(html.includes("customer-presentation-mode"));
  assert(html.includes("Ügyfélprezentáció"));
  assert(html.includes("Ügyfélnek szánt nézet"));
  assert(html.includes("Fizetendő bruttó"));
});

test("quote items render room and position metadata", () => {
  const html = renderApp("?mode=demo", "state.quotes[0].items[0].room = 'Nappali'; state.quotes[0].items[0].position = 'A-01'; ui.view = 'quote-editor'; ui.selectedItemId = state.quotes[0].items[0].id; ui.itemDraft = normalizeItem(state.quotes[0].items[0]); render();");

  assert(html.includes("Helyiség: Nappali"));
  assert(html.includes("Pozíció: A-01"));
});

test("exterior quote items render opening direction metadata", () => {
  const html = renderApp("?mode=demo", "state.quotes[0].items[0].openingDirection = 'left'; ui.view = 'quote-editor'; ui.selectedItemId = state.quotes[0].items[0].id; ui.itemDraft = normalizeItem(state.quotes[0].items[0]); render();");

  assert(html.includes("Nyitásirány"));
  assert(html.includes("Balos"));
});

test("quote items render grouped section totals", () => {
  const html = renderApp("?mode=demo", "var extraItem = normalizeItem({ ...state.quotes[0].items[0], id: 'item-install-test', sectionId: 'installation', position: 'B-01' }); state.quotes[0].items.push(extraItem); ui.view = 'quote-editor'; render();");

  assert(html.includes("section-row"));
  assert(html.includes("Nyílászárók"));
  assert(html.includes("Beépítés"));
  assert(html.includes("B-01"));
});
