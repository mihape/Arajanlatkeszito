const { SCHEMA_VERSION } = require("../shared/sqlite-schema");
const { TABLES } = require("../shared/storage-contract");

function createPendingSqliteAdapter() {
  return {
    getStatus() {
      return {
        engine: "sqlite-planned",
        ready: false,
        schemaVersion: SCHEMA_VERSION,
        tables: TABLES,
        note: "SQLite schema and preload boundary are prepared; renderer still uses localStorage until the migration step."
      };
    }
  };
}

module.exports = {
  createPendingSqliteAdapter
};
