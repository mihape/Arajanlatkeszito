const fs = require("fs");
const path = require("path");
const { MIGRATIONS, SCHEMA_VERSION } = require("../shared/sqlite-schema");
const { TABLES } = require("../shared/storage-contract");

const APP_STATE_KEY = "app_state";

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
    },

    loadState() {
      return {
        state: null,
        schemaVersion: SCHEMA_VERSION,
        ready: false
      };
    },

    saveState() {
      return {
        ok: false,
        ready: false
      };
    },

    importState() {
      return {
        ok: false,
        ready: false
      };
    },

    exportState() {
      return {
        state: null,
        schemaVersion: SCHEMA_VERSION,
        ready: false
      };
    }
  };
}

function createSqliteAdapter(options = {}) {
  const dataDir = options.dataDir;
  if (!dataDir) return createPendingSqliteAdapter();

  let DatabaseSync;
  try {
    ({ DatabaseSync } = require("node:sqlite"));
  } catch (error) {
    return createUnavailableAdapter(error);
  }

  fs.mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, options.fileName || "app-state.sqlite");
  const db = new DatabaseSync(dbPath);
  initializeDatabase(db);

  return {
    getStatus() {
      return {
        engine: "node:sqlite",
        ready: true,
        schemaVersion: SCHEMA_VERSION,
        path: dbPath,
        tables: TABLES,
        hasState: Boolean(loadAppState(db))
      };
    },

    loadState() {
      return {
        state: loadAppState(db),
        path: dbPath,
        schemaVersion: SCHEMA_VERSION
      };
    },

    saveState(state) {
      saveAppState(db, state);
      return {
        ok: true,
        path: dbPath,
        savedAt: new Date().toISOString()
      };
    },

    importState(state) {
      saveAppState(db, state);
      return {
        ok: true,
        path: dbPath,
        importedAt: new Date().toISOString()
      };
    },

    exportState() {
      return {
        state: loadAppState(db),
        path: dbPath,
        exportedAt: new Date().toISOString()
      };
    }
  };
}

function createUnavailableAdapter(error) {
  const pending = createPendingSqliteAdapter();
  return {
    ...pending,
    getStatus() {
      return {
        ...pending.getStatus(),
        engine: "sqlite-unavailable",
        error: error?.code || error?.message || "node:sqlite is not available"
      };
    }
  };
}

function initializeDatabase(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);

  MIGRATIONS.forEach((migration) => {
    const applied = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(migration.version);
    if (applied) return;
    db.exec("BEGIN");
    try {
      migration.statements.forEach((statement) => db.exec(statement));
      db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)").run(
        migration.version,
        migration.name,
        new Date().toISOString()
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  });
}

function loadAppState(db) {
  const row = db.prepare("SELECT value_json FROM settings WHERE key = ?").get(APP_STATE_KEY);
  if (!row?.value_json) return null;
  return JSON.parse(row.value_json);
}

function saveAppState(db, state) {
  if (!state || typeof state !== "object") {
    throw new Error("Cannot save empty application state.");
  }
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `).run(APP_STATE_KEY, JSON.stringify(state), now);
}

module.exports = {
  createPendingSqliteAdapter,
  createSqliteAdapter,
  initializeDatabase,
  loadAppState,
  saveAppState
};
