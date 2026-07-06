const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { createSqliteAdapter } = require("../src/main/database");

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
  assert.equal(status.schemaVersion, 1);
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
    }]
  };

  adapter.saveState(state);

  assert.equal(adapter.getStatus().hasState, true);
  assert.deepEqual(adapter.loadState().state, state);
  assert.deepEqual(adapter.exportState().state, state);
  assert.equal(adapter.getStatus().counts.customers, 1);
  assert.equal(adapter.getStatus().counts.quotes, 1);
  assert.equal(adapter.getStatus().counts.quote_items, 1);
  assert.equal(adapter.getStatus().counts.profiles, 1);
  assert.equal(adapter.getStatus().counts.price_matrices, 1);
  assert.equal(adapter.getStatus().counts.price_matrix_cells, 2);
  assert.equal(adapter.getStatus().counts.interior_models, 1);
  assert.equal(adapter.getStatus().counts.item_images, 2);
  assert(fs.existsSync(path.join(dataDir, "test.sqlite")));
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
      interiorDoors: { manufacturers: [], models: [], colors: [], frames: [], handles: [], locks: [] }
    },
    openingImages: {},
    quotes: []
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
  assert.equal(result.ok, true);
  assert.equal(result.state.customers.length, 0);
  assert.equal(adapter.getStatus().counts.customers, 0);
});
