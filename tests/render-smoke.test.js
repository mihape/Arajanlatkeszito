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
  vm.runInContext(fs.readFileSync(path.join(root, "src/shared/matrix-import.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "src/renderer/app.js"), "utf8"), context);
  if (afterRenderScript) vm.runInContext(afterRenderScript, context);
  return appElement.innerHTML;
}

test("renderer index loads shared pricing before app", () => {
  const html = fs.readFileSync(path.join(root, "src/renderer/index.html"), "utf8");
  const pricingIndex = html.indexOf("../shared/pricing-calculations.js");
  const matrixImportIndex = html.indexOf("../shared/matrix-import.js");
  const appIndex = html.indexOf("app.js");

  assert(pricingIndex > -1, "pricing module script is missing");
  assert(matrixImportIndex > -1, "matrix import module script is missing");
  assert(appIndex > -1, "app script is missing");
  assert(pricingIndex < appIndex, "pricing module must load before app.js");
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

test("quote editor renders overview and active item cues", () => {
  const html = renderApp("?mode=demo", "ui.view = 'quote-editor'; ui.selectedItemId = state.quotes[0].items[0].id; ui.itemDraft = normalizeItem(state.quotes[0].items[0]); render();");

  assert(html.includes("quote-overview"));
  assert(html.includes("Prezentációs előnézet"));
  assert(html.includes("Beszerzési ár nélkül"));
  assert(html.includes("Fizetendő bruttó"));
  assert(html.includes("Aktív"));
  assert(html.includes("Szerkesztés alatt"));
});
