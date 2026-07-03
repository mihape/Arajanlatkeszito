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
    quotes: []
  };

  adapter.saveState(state);

  assert.equal(adapter.getStatus().hasState, true);
  assert.deepEqual(adapter.loadState().state, state);
  assert.deepEqual(adapter.exportState().state, state);
  assert(fs.existsSync(path.join(dataDir, "test.sqlite")));
});
