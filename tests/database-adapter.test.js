const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createSqliteAdapter } = require("../src/main/database");
const { DatabaseSync } = require("node:sqlite");
const { MIGRATIONS } = require("../src/shared/sqlite-schema");

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

test("SQLite adapter initializes schema and persists app state", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(tmpRoot, "nyilaszaro-db-"));
  const adapter = createSqliteAdapter({ dataDir, fileName: "test.sqlite" });
  const status = adapter.getStatus();

  assert.equal(status.ready, true);
  assert.equal(status.engine, "node:sqlite");
  assert.equal(status.schemaVersion, 2);
  assert.equal(status.hasState, false);

  const state = {
    settings: { companyName: "Demo" },
    customers: [{ id: "customer-1", name: "Demo Partner Kft." }],
    catalog: {
      profiles: [{ id: "profile-1", manufacturer: "Demo", name: "Profil", uf: 1.1, ug2: 1, ug3: 0.6 }],
      exteriorOpenings: [{ id: "tilt-turn", name: "KFNY ablak", productTypeId: "window" }],
      matrices: {
        "profile-1__tilt-turn": {
          widths: [1000, 1100],
          heights: [1200],
          prices: { "1000x1200": 50000, "1100x1200": 56000 },
          blocked: { "1100x1200": true }
        }
      },
      colors: [{ id: "color-white", name: "Feher", type: "percent", outsideValue: 0, bothValue: 0 }],
      glasses: [{ id: "glass-2", name: "2 rtg", layers: 2, ug: 1, type: "percent", value: 0 }],
      extensions: [{ id: "ext-30", mm: 30, pricePerM: 1000 }],
      accessories: [{ id: "install-window", category: "install", name: "Beepites", pricing: "fixed", price: 10000 }],
      completeQuote: {
        categories: [{ id: "complete-category-insulation", name: "Hőszigetelés", kind: "regular", position: 0, active: true }],
        itemTemplates: [{ id: "complete-template-eps", categoryId: "complete-category-insulation", description: "EPS rendszer", unit: "m²", materialUnitNet: 3200, laborUnitNet: 1800, active: true }]
      },
      interiorDoors: {
        manufacturers: [{ id: "int-manufacturer", name: "Belteri gyarto", sizing: "custom" }],
        models: [{
          id: "int-model",
          manufacturerId: "int-manufacturer",
          name: "Belteri modell",
          decorPrice: 100,
          cplPrice: 150,
          customFrameEnabled: true,
          decorIncludedFrameCm: 12,
          cplIncludedFrameCm: 15,
          customFrameSurchargePerCm: 10,
          images: { "int-color-white": "data:image/png;base64,aaa" }
        }],
        colors: [{ id: "int-color-white", name: "Feher" }],
        frames: [{ id: "int-frame", name: "100-120", price: 0 }],
        handles: [{ id: "int-handle", name: "Kilincs", price: 0 }],
        locks: [{ id: "int-lock", name: "BB", price: 0 }]
      }
    },
    openingImages: { "tilt-turn": "data:image/png;base64,bbb" },
    quotes: [{
      id: "quote-1",
      number: "AJ-1",
      customerId: "customer-1",
      status: "Vazlat",
      updatedAt: "2026-07-06",
      version: 2,
      statusHistory: [{ status: "Vazlat", at: "2026-07-06", note: "Workflow smoke" }],
      margin: 20,
      vat: 27,
      items: [{
        id: "item-1",
        productTypeId: "window",
        openingTypeId: "tilt-turn",
        profileId: "profile-1",
        width: 1000,
        height: 1200,
        quantity: 2
      }]
    }],
    completeQuotes: [{
      id: "complete-quote-1", number: "TZG-2026-0001", customerId: "customer-1", projectAddress: "Mintautca 1.", workDescription: "Hőszigetelési munkák", createdAt: "2026-07-06", updatedAt: "2026-07-06", validityDays: 15, vat: 27, status: "Vázlat", version: 1, statusHistory: [{ status: "Vázlat", at: "2026-07-06", note: "Létrehozva" }], note: "",
      sections: [{ id: "complete-section-1", categoryId: "complete-category-insulation", name: "Hőszigetelés", kind: "regular", position: 0, items: [{ id: "complete-item-1", templateId: "complete-template-eps", description: "EPS rendszer", quantity: 12.5, unit: "m²", materialUnitNet: 3200, laborUnitNet: 1800, position: 0 }] }]
    }]
  };

  adapter.saveState(state);

  assert.equal(adapter.getStatus().hasState, true);
  const loaded = adapter.loadState().state;
  const exported = adapter.exportState().state;
  assert.equal(adapter.loadState().normalized, true);
  assert.equal(loaded.settings.companyName, state.settings.companyName);
  assert.equal(loaded.customers[0].name, state.customers[0].name);
  assert.equal(loaded.catalog.profiles[0].manufacturer, "Demo");
  assert.equal(loaded.catalog.exteriorOpenings[0].productTypeId, "window");
  assert.deepEqual(loaded.catalog.matrices["profile-1__tilt-turn"].widths, [1000, 1100]);
  assert.equal(loaded.catalog.matrices["profile-1__tilt-turn"].prices["1100x1200"], 56000);
  assert.equal(loaded.catalog.matrices["profile-1__tilt-turn"].blocked["1100x1200"], true);
  assert.equal(loaded.catalog.interiorDoors.models[0].images["int-color-white"], "data:image/png;base64,aaa");
  assert.equal(loaded.openingImages["tilt-turn"], "data:image/png;base64,bbb");
  assert.equal(loaded.quotes[0].number, "AJ-1");
  assert.equal(loaded.quotes[0].version, 2);
  assert.equal(loaded.quotes[0].statusHistory[0].note, "Workflow smoke");
  assert.equal(loaded.quotes[0].items[0].quantity, 2);
  assert.equal(exported.quotes[0].items[0].id, "item-1");
  assert.equal(loaded.catalog.completeQuote.categories[0].name, "Hőszigetelés");
  assert.equal(loaded.catalog.completeQuote.itemTemplates[0].materialUnitNet, 3200);
  assert.equal(loaded.completeQuotes[0].number, "TZG-2026-0001");
  assert.equal(loaded.completeQuotes[0].sections[0].items[0].quantity, 12.5);
  assert.equal(adapter.getStatus().counts.customers, 1);
  assert.equal(adapter.getStatus().counts.quotes, 1);
  assert.equal(adapter.getStatus().counts.quote_items, 1);
  assert.equal(adapter.getStatus().counts.profiles, 1);
  assert.equal(adapter.getStatus().counts.price_matrices, 1);
  assert.equal(adapter.getStatus().counts.price_matrix_cells, 2);
  assert.equal(adapter.getStatus().counts.interior_models, 1);
  assert.equal(adapter.getStatus().counts.item_images, 2);
  assert.equal(adapter.getStatus().counts.complete_quotes, 1);
  assert.equal(adapter.getStatus().counts.complete_quote_items, 1);
  assert(fs.existsSync(path.join(dataDir, "test.sqlite")));
});

test("SQLite v1 database migrates to v2 without changing existing quote rows", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(tmpRoot, "nyilaszaro-v1-migration-"));
  const fileName = "v1.sqlite";
  const dbPath = path.join(dataDir, fileName);
  const legacy = new DatabaseSync(dbPath);
  legacy.exec("PRAGMA foreign_keys = ON");
  legacy.exec("CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)");
  MIGRATIONS[0].statements.forEach((statement) => legacy.exec(statement));
  legacy.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(1, "initial-local-quote-schema", "2026-08-01T00:00:00.000Z");
  legacy.prepare("INSERT INTO customers (id, name, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run("customer-v1", "V1 ügyfél", "local", "2026-08-01", "2026-08-01");
  legacy.prepare("INSERT INTO quotes (id, number, customer_id, status, margin_percent, vat, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("quote-v1", "AJ-V1-1", "customer-v1", "Vázlat", 10, "27", "local", "2026-08-01", "2026-08-01");
  legacy.close();

  const adapter = createSqliteAdapter({ dataDir, fileName });
  const loaded = adapter.loadState().state;
  assert.equal(adapter.getStatus().schemaVersion, 2);
  assert.equal(loaded.customers[0].name, "V1 ügyfél");
  assert.equal(loaded.quotes[0].number, "AJ-V1-1");
  assert.equal(loaded.completeQuotes.length, 0);
  assert.equal(loaded.catalog.completeQuote.categories.length, 0);
});

test("SQLite adapter exposes customer and quote CRUD mutations", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(tmpRoot, "nyilaszaro-crud-db-"));
  const adapter = createSqliteAdapter({ dataDir, fileName: "crud.sqlite" });

  adapter.saveState({
    settings: {},
    customers: [],
    catalog: {
      profiles: [],
      exteriorOpenings: [],
      matrices: {},
      colors: [],
      glasses: [],
      extensions: [],
      accessories: [],
      completeQuote: { categories: [{ id: "category-1", name: "Festés", kind: "regular", position: 0, active: true }], itemTemplates: [] },
      interiorDoors: { manufacturers: [], models: [], colors: [], frames: [], handles: [], locks: [] }
    },
    openingImages: {},
    quotes: [],
    completeQuotes: []
  });

  let result = adapter.upsertCustomer({ id: "customer-1", name: "Demo Partner Kft.", email: "demo@example.invalid" });
  assert.equal(result.ok, true);
  assert.equal(result.state.customers.length, 1);
  assert.equal(adapter.getStatus().counts.customers, 1);

  result = adapter.upsertQuote({
    id: "quote-1",
    number: "AJ-1",
    customerId: "customer-1",
    status: "Vazlat",
    margin: 20,
    vat: 27,
    items: [{ id: "item-1", productTypeId: "window", width: 1000, height: 1200, quantity: 1 }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.quotes.length, 1);
  assert.equal(adapter.getStatus().counts.quotes, 1);
  assert.equal(adapter.getStatus().counts.quote_items, 1);

  result = adapter.upsertCompleteQuote({
    id: "complete-quote-1", number: "TZG-2026-0001", customerId: "customer-1", projectAddress: "Mintautca 1.", workDescription: "Festés", createdAt: "2026-08-01", updatedAt: "2026-08-01", validityDays: 15, vat: 27, status: "Vázlat", version: 1,
    sections: [{ id: "section-1", categoryId: "category-1", name: "Festés", kind: "regular", position: 0, items: [{ id: "complete-item-1", description: "Festés", quantity: 1, unit: "m²", materialUnitNet: 0, laborUnitNet: 1000, position: 0 }] }]
  });
  assert.equal(result.ok, true);
  assert.equal(adapter.getStatus().counts.complete_quotes, 1);
  assert.equal(adapter.getStatus().counts.complete_quote_items, 1);

  result = adapter.deleteCustomer("customer-1");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "customer-in-use");
  assert.equal(adapter.getStatus().counts.customers, 1);

  result = adapter.deleteQuote("quote-1");
  assert.equal(result.ok, true);
  assert.equal(result.state.quotes.length, 0);
  assert.equal(adapter.getStatus().counts.quotes, 0);
  assert.equal(adapter.getStatus().counts.quote_items, 0);

  result = adapter.deleteCustomer("customer-1");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "customer-in-use");

  result = adapter.deleteCompleteQuote("complete-quote-1");
  assert.equal(result.ok, true);

  result = adapter.deleteCustomer("customer-1");
  assert.equal(result.ok, true);
  assert.equal(result.state.customers.length, 0);
  assert.equal(adapter.getStatus().counts.customers, 0);
});

test("SQLite adapter exports and imports backups through normalized tables", () => {
  const tmpRoot = path.join(root, ".tmp-tests");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const dataDir = fs.mkdtempSync(path.join(tmpRoot, "nyilaszaro-backup-db-"));
  const adapter = createSqliteAdapter({ dataDir, fileName: "backup.sqlite" });

  const firstState = {
    settings: { companyName: "Elso ceg" },
    customers: [{ id: "customer-1", name: "Elso ugyfel" }],
    catalog: {
      profiles: [{ id: "profile-1", manufacturer: "Demo", name: "Profil A", uf: 1.1, ug2: 1, ug3: 0.6 }],
      exteriorOpenings: [{ id: "opening-1", name: "KFNY ablak", productTypeId: "window" }],
      matrices: {
        "profile-1__opening-1": {
          widths: [1000],
          heights: [1200],
          prices: { "1000x1200": 50000 },
          blocked: {}
        }
      },
      colors: [],
      glasses: [],
      extensions: [],
      accessories: [],
      completeQuote: { categories: [{ id: "category-1", name: "Festés", kind: "regular", position: 0, active: true }], itemTemplates: [{ id: "template-1", categoryId: "category-1", description: "Festés", unit: "m²", materialUnitNet: 100, laborUnitNet: 200, active: true }] },
      interiorDoors: { manufacturers: [], models: [], colors: [], frames: [], handles: [], locks: [] }
    },
    openingImages: {},
    quotes: [{ id: "quote-1", number: "AJ-1", customerId: "customer-1", status: "Vazlat", items: [] }],
    completeQuotes: [{ id: "complete-quote-1", number: "TZG-2026-0001", customerId: "customer-1", projectAddress: "Mintautca", workDescription: "Festés", createdAt: "2026-08-01", updatedAt: "2026-08-01", validityDays: 15, vat: 27, status: "Vázlat", version: 1, sections: [{ id: "section-1", categoryId: "category-1", name: "Festés", kind: "regular", position: 0, items: [{ id: "complete-item-1", templateId: "template-1", description: "Festés", quantity: 2.5, unit: "m²", materialUnitNet: 100, laborUnitNet: 200, position: 0 }] }] }]
  };

  const importedState = {
    ...firstState,
    settings: { companyName: "Importalt ceg" },
    customers: [{ id: "customer-2", name: "Importalt ugyfel" }],
    quotes: [{
      id: "quote-2",
      number: "AJ-2",
      customerId: "customer-2",
      status: "Elfogadva",
      items: [{ id: "item-2", productTypeId: "window", width: 1000, height: 1200, quantity: 3 }]
    }],
    completeQuotes: [{ id: "complete-quote-2", number: "TZG-2026-0002", customerId: "customer-2", projectAddress: "Import utca", workDescription: "Importált festés", createdAt: "2026-08-02", updatedAt: "2026-08-02", validityDays: 15, vat: 27, status: "Vázlat", version: 1, sections: [{ id: "section-2", categoryId: "category-1", name: "Festés", kind: "regular", position: 0, items: [{ id: "complete-item-2", templateId: "template-1", description: "Festés", quantity: 2.5, unit: "m²", materialUnitNet: 100, laborUnitNet: 200, position: 0 }] }] }]
  };

  adapter.saveState(firstState);
  assert.equal(adapter.exportState().state.customers[0].name, "Elso ugyfel");

  const importResult = adapter.importState(importedState);
  assert.equal(importResult.ok, true);
  assert.equal(importResult.state.settings.companyName, "Importalt ceg");
  assert.equal(importResult.state.customers[0].id, "customer-2");
  assert.equal(importResult.state.quotes[0].items[0].quantity, 3);
  assert.equal(importResult.state.completeQuotes[0].sections[0].items[0].quantity, 2.5);

  const exported = adapter.exportState();
  assert.equal(exported.normalized, true);
  assert.equal(exported.state.customers.length, 1);
  assert.equal(exported.state.customers[0].name, "Importalt ugyfel");
  assert.equal(adapter.getStatus().counts.customers, 1);
  assert.equal(adapter.getStatus().counts.quotes, 1);
  assert.equal(adapter.getStatus().counts.quote_items, 1);
  assert.equal(adapter.getStatus().counts.complete_quotes, 1);
  assert.equal(adapter.getStatus().counts.complete_quote_items, 1);
});
