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
        hasState: Boolean(loadAppState(db)),
        counts: getTableCounts(db)
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
      persistState(db, state);
      return {
        ok: true,
        normalized: true,
        path: dbPath,
        savedAt: new Date().toISOString()
      };
    },

    importState(state) {
      persistState(db, state);
      return {
        ok: true,
        normalized: true,
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

function persistState(db, state) {
  db.exec("BEGIN");
  try {
    saveAppState(db, state);
    replaceNormalizedTables(db, state);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function replaceNormalizedTables(db, state) {
  const now = new Date().toISOString();
  [
    "quote_items",
    "quotes",
    "price_matrix_cells",
    "price_matrices",
    "item_images",
    "interior_models",
    "customers",
    "profiles",
    "exterior_opening_types",
    "colors",
    "glasses",
    "extensions",
    "accessories",
    "interior_manufacturers",
    "interior_colors",
    "interior_frames",
    "interior_handles",
    "interior_locks"
  ].forEach((table) => db.exec(`DELETE FROM ${table}`));

  insertCustomers(db, state.customers || [], now);
  insertProfiles(db, state.catalog?.profiles || [], now);
  insertExteriorOpenings(db, state.catalog?.exteriorOpenings || [], now);
  insertPriceMatrices(db, state.catalog?.matrices || {}, state, now);
  insertColors(db, state.catalog?.colors || [], now);
  insertGlasses(db, state.catalog?.glasses || [], now);
  insertExtensions(db, state.catalog?.extensions || [], now);
  insertAccessories(db, state.catalog?.accessories || [], now);
  insertInteriorCatalog(db, state.catalog?.interiorDoors || {}, now);
  insertQuotes(db, state.quotes || [], state, now);
  insertImages(db, state, now);
}

function insertCustomers(db, customers, now) {
  const stmt = db.prepare(`
    INSERT INTO customers (
      id, name, phone, email, address, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  customers.forEach((item) => stmt.run(
    item.id,
    item.name || "Nevtelen ugyfel",
    item.phone || null,
    item.email || null,
    item.address || null,
    item.note || null,
    ...syncValues(item, now)
  ));
}

function insertQuotes(db, quotes, state, now) {
  const customerIds = new Set((state.customers || []).map((customer) => customer.id));
  const quoteStmt = db.prepare(`
    INSERT INTO quotes (
      id, number, customer_id, project_address, status, created_on,
      production_deadline, margin_percent, vat, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const itemStmt = db.prepare(`
    INSERT INTO quote_items (
      id, quote_id, position, product_type_id, opening_type_id, profile_id,
      width_mm, height_mm, quantity, payload_json,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  quotes.forEach((quote) => {
    quoteStmt.run(
      quote.id,
      quote.number || quote.id,
      customerIds.has(quote.customerId) ? quote.customerId : null,
      quote.projectAddress || null,
      quote.status || "Vazlat",
      quote.createdAt || null,
      quote.productionDeadline || null,
      toNumber(quote.margin),
      String(quote.vat ?? "27"),
      quote.note || null,
      ...syncValues(quote, now)
    );

    (quote.items || []).forEach((item, index) => {
      itemStmt.run(
        item.id || `${quote.id}-item-${index + 1}`,
        quote.id,
        index,
        item.productTypeId || "window",
        item.openingTypeId || null,
        item.profileId || null,
        toNumber(item.width),
        toNumber(item.height),
        toNumber(item.quantity, 1),
        JSON.stringify(item),
        ...syncValues(item, now)
      );
    });
  });
}

function insertProfiles(db, profiles, now) {
  const stmt = db.prepare(`
    INSERT INTO profiles (
      id, manufacturer, name, category, uf, ug2, ug3, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  profiles.forEach((item) => stmt.run(
    item.id,
    item.manufacturer || "",
    item.name || "",
    item.category || null,
    toNumber(item.uf),
    toNumber(item.ug2),
    toNumber(item.ug3),
    item.note || null,
    ...syncValues(item, now)
  ));
}

function insertExteriorOpenings(db, openings, now) {
  const stmt = db.prepare(`
    INSERT INTO exterior_opening_types (
      id, name, product_type_id, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  openings
    .filter((item) => item.productTypeId !== "interior-door")
    .forEach((item) => stmt.run(
      item.id,
      item.name || "",
      item.productTypeId || "window",
      item.note || null,
      ...syncValues(item, now)
    ));
}

function insertPriceMatrices(db, matrices, state, now) {
  const profileIds = new Set((state.catalog?.profiles || []).map((item) => item.id));
  const openingIds = new Set((state.catalog?.exteriorOpenings || [])
    .filter((item) => item.productTypeId !== "interior-door")
    .map((item) => item.id));
  const matrixStmt = db.prepare(`
    INSERT INTO price_matrices (
      id, profile_id, opening_type_id, raster_mm,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const cellStmt = db.prepare(`
    INSERT INTO price_matrix_cells (
      id, matrix_id, width_mm, height_mm, purchase_price_net, is_blocked, block_reason,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  Object.entries(matrices).forEach(([matrixId, matrix]) => {
    const [profileId, openingTypeId] = matrixId.split("__");
    if (!profileIds.has(profileId) || !openingIds.has(openingTypeId)) return;

    matrixStmt.run(matrixId, profileId, openingTypeId, 100, null, "local", null, now, now);
    (matrix.widths || []).forEach((width) => {
      (matrix.heights || []).forEach((height) => {
        const cellKey = `${width}x${height}`;
        const blocked = Boolean(matrix.blocked?.[cellKey]);
        cellStmt.run(
          `${matrixId}__${cellKey}`,
          matrixId,
          toNumber(width),
          toNumber(height),
          blocked ? 0 : toNumber(matrix.prices?.[cellKey]),
          blocked ? 1 : 0,
          blocked ? "Nem gyarthato meret" : null,
          null,
          "local",
          null,
          now,
          now
        );
      });
    });
  });
}

function insertColors(db, colors, now) {
  const stmt = db.prepare(`
    INSERT INTO colors (
      id, name, price_type, outside_value, both_value,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  colors.forEach((item) => stmt.run(
    item.id,
    item.name || "",
    item.type || "percent",
    toNumber(item.outsideValue),
    toNumber(item.bothValue),
    ...syncValues(item, now)
  ));
}

function insertGlasses(db, glasses, now) {
  const stmt = db.prepare(`
    INSERT INTO glasses (
      id, name, layers, ug, price_type, value,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  glasses.forEach((item) => stmt.run(
    item.id,
    item.name || "",
    toNumber(item.layers),
    toNumber(item.ug),
    item.type || "percent",
    toNumber(item.value),
    ...syncValues(item, now)
  ));
}

function insertExtensions(db, extensions, now) {
  const stmt = db.prepare(`
    INSERT INTO extensions (
      id, mm, price_per_m,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  extensions.forEach((item) => stmt.run(
    item.id,
    toNumber(item.mm),
    toNumber(item.pricePerM),
    ...syncValues(item, now)
  ));
}

function insertAccessories(db, accessories, now) {
  const stmt = db.prepare(`
    INSERT INTO accessories (
      id, category, name, pricing, price,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  accessories.forEach((item) => stmt.run(
    item.id,
    item.category || "accessory",
    item.name || "",
    item.pricing || "fixed",
    toNumber(item.price),
    ...syncValues(item, now)
  ));
}

function insertInteriorCatalog(db, catalog, now) {
  const manufacturerStmt = db.prepare(`
    INSERT INTO interior_manufacturers (
      id, name, sizing, sizes_text, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const modelStmt = db.prepare(`
    INSERT INTO interior_models (
      id, manufacturer_id, name, decor_price, cpl_price, custom_frame_enabled,
      decor_included_frame_cm, cpl_included_frame_cm, custom_frame_surcharge_per_cm, note,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const manufacturers = catalog.manufacturers || [];
  const manufacturerIds = new Set(manufacturers.map((item) => item.id));
  manufacturers.forEach((item) => manufacturerStmt.run(
    item.id,
    item.name || "",
    item.sizing || "custom",
    item.sizesText || null,
    item.note || null,
    ...syncValues(item, now)
  ));

  (catalog.models || [])
    .filter((item) => manufacturerIds.has(item.manufacturerId))
    .forEach((item) => modelStmt.run(
      item.id,
      item.manufacturerId,
      item.name || "",
      toNumber(item.decorPrice),
      toNumber(item.cplPrice),
      item.customFrameEnabled ? 1 : 0,
      toNumber(item.decorIncludedFrameCm),
      toNumber(item.cplIncludedFrameCm),
      toNumber(item.customFrameSurchargePerCm),
      item.note || null,
      ...syncValues(item, now)
    ));

  insertNamedPriceRows(db, "interior_colors", catalog.colors || [], now, false);
  insertNamedPriceRows(db, "interior_frames", catalog.frames || [], now, true);
  insertNamedPriceRows(db, "interior_handles", catalog.handles || [], now, true);
  insertNamedPriceRows(db, "interior_locks", catalog.locks || [], now, true);
}

function insertNamedPriceRows(db, table, rows, now, hasPrice) {
  const columns = hasPrice
    ? "(id, name, price, external_id, sync_status, synced_at, created_at, updated_at)"
    : "(id, name, external_id, sync_status, synced_at, created_at, updated_at)";
  const placeholders = hasPrice ? "?, ?, ?, ?, ?, ?, ?, ?" : "?, ?, ?, ?, ?, ?, ?";
  const stmt = db.prepare(`INSERT INTO ${table} ${columns} VALUES (${placeholders})`);
  rows.forEach((item) => {
    const values = hasPrice
      ? [item.id, item.name || "", toNumber(item.price), ...syncValues(item, now)]
      : [item.id, item.name || "", ...syncValues(item, now)];
    stmt.run(...values);
  });
}

function insertImages(db, state, now) {
  const stmt = db.prepare(`
    INSERT INTO item_images (
      id, owner_type, owner_id, color_id, file_path, data_url,
      external_id, sync_status, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  Object.entries(state.openingImages || {}).forEach(([openingId, dataUrl]) => {
    if (!dataUrl) return;
    stmt.run(imageId("exterior_opening", openingId), "exterior_opening", openingId, null, null, dataUrl, null, "local", null, now, now);
  });

  (state.catalog?.interiorDoors?.models || []).forEach((model) => {
    Object.entries(model.images || {}).forEach(([colorId, dataUrl]) => {
      if (!dataUrl) return;
      stmt.run(imageId("interior_model", model.id, colorId), "interior_model", model.id, colorId, null, dataUrl, null, "local", null, now, now);
    });
  });
}

function syncValues(item, now) {
  return [
    item.external_id || item.externalId || null,
    item.sync_status || item.syncStatus || "local",
    item.synced_at || item.syncedAt || null,
    item.created_at || item.createdAt || now,
    item.updated_at || item.updatedAt || now
  ];
}

function getTableCounts(db) {
  return TABLES.reduce((counts, table) => {
    counts[table] = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    return counts;
  }, {});
}

function imageId(ownerType, ownerId, colorId = "default") {
  return `${ownerType}__${ownerId}__${colorId}`;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

module.exports = {
  createPendingSqliteAdapter,
  createSqliteAdapter,
  initializeDatabase,
  loadAppState,
  saveAppState,
  persistState
};
