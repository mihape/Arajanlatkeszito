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
    },

    upsertCustomer() {
      return { ok: false, ready: false, state: null };
    },

    deleteCustomer() {
      return { ok: false, ready: false, state: null };
    },

    upsertQuote() {
      return { ok: false, ready: false, state: null };
    },

    deleteQuote() {
      return { ok: false, ready: false, state: null };
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
      const normalizedState = loadNormalizedState(db);
      return {
        state: normalizedState || loadAppState(db),
        path: dbPath,
        schemaVersion: SCHEMA_VERSION,
        normalized: Boolean(normalizedState)
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
        ...mutationResult(loadNormalizedState(db) || loadAppState(db), dbPath),
        importedAt: new Date().toISOString()
      };
    },

    exportState() {
      const normalizedState = loadNormalizedState(db);
      return {
        state: normalizedState || loadAppState(db),
        path: dbPath,
        exportedAt: new Date().toISOString(),
        normalized: Boolean(normalizedState)
      };
    },

    upsertCustomer(customer) {
      const state = requireState(db);
      upsertById(state, "customers", customer);
      persistState(db, state);
      return mutationResult(state, dbPath);
    },

    deleteCustomer(id) {
      const state = requireState(db);
      const used = (state.quotes || []).some((quote) => quote.customerId === id);
      if (used) {
        return {
          ok: false,
          reason: "customer-in-use",
          message: "Cannot delete a customer while quotes reference it.",
          state
        };
      }
      state.customers = (state.customers || []).filter((customer) => customer.id !== id);
      persistState(db, state);
      return mutationResult(state, dbPath);
    },

    upsertQuote(quote) {
      const state = requireState(db);
      upsertById(state, "quotes", quote, { prepend: true });
      persistState(db, state);
      return mutationResult(state, dbPath);
    },

    deleteQuote(id) {
      const state = requireState(db);
      state.quotes = (state.quotes || []).filter((quote) => quote.id !== id);
      persistState(db, state);
      return mutationResult(state, dbPath);
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

function loadNormalizedState(db) {
  const counts = getTableCounts(db);
  const hasNormalizedRows = [
    "customers",
    "quotes",
    "profiles",
    "exterior_opening_types",
    "price_matrices",
    "colors",
    "glasses",
    "extensions",
    "accessories",
    "interior_manufacturers",
    "interior_models"
  ].some((table) => counts[table] > 0);
  if (!hasNormalizedRows) return null;

  const fallback = loadAppState(db) || {};
  const interiorDoors = loadInteriorDoors(db);
  return {
    ...fallback,
    settings: fallback.settings || {},
    customers: loadCustomers(db),
    catalog: {
      ...(fallback.catalog || {}),
      profiles: loadProfiles(db),
      exteriorOpenings: loadExteriorOpenings(db),
      matrices: loadPriceMatrices(db),
      colors: loadColors(db),
      glasses: loadGlasses(db),
      extensions: loadExtensions(db),
      accessories: loadAccessories(db),
      interiorDoors
    },
    openingImages: loadOpeningImages(db),
    quotes: loadQuotes(db, fallback.quotes || [])
  };
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

function requireState(db) {
  const state = loadAppState(db);
  if (!state) {
    throw new Error("Application state is not initialized.");
  }
  if (!Array.isArray(state.customers)) state.customers = [];
  if (!Array.isArray(state.quotes)) state.quotes = [];
  return state;
}

function upsertById(state, collection, item, options = {}) {
  if (!item?.id) throw new Error(`Cannot upsert ${collection} item without id.`);
  if (!Array.isArray(state[collection])) state[collection] = [];
  const index = state[collection].findIndex((row) => row.id === item.id);
  if (index >= 0) {
    state[collection][index] = item;
  } else if (options.prepend) {
    state[collection].unshift(item);
  } else {
    state[collection].push(item);
  }
}

function mutationResult(state, path) {
  return {
    ok: true,
    normalized: true,
    state,
    path,
    savedAt: new Date().toISOString()
  };
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

function loadCustomers(db) {
  return db.prepare("SELECT * FROM customers ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    name: row.name || "",
    phone: row.phone || "",
    email: row.email || "",
    address: row.address || "",
    note: row.note || "",
    ...camelSyncFields(row)
  }));
}

function loadQuotes(db, fallbackQuotes = []) {
  const fallbackById = new Map(fallbackQuotes.map((quote) => [quote.id, quote]));
  const itemsByQuote = db.prepare("SELECT * FROM quote_items ORDER BY quote_id, position, id").all().reduce((map, row) => {
    const item = JSON.parse(row.payload_json);
    if (!map.has(row.quote_id)) map.set(row.quote_id, []);
    map.get(row.quote_id).push({ ...item, id: item.id || row.id });
    return map;
  }, new Map());

  return db.prepare("SELECT * FROM quotes ORDER BY created_at DESC, id").all().map((row) => {
    const fallback = fallbackById.get(row.id) || {};
    return {
      ...fallback,
      id: row.id,
      number: row.number || row.id,
      customerId: row.customer_id || "",
      projectAddress: row.project_address || "",
      status: row.status || "Vazlat",
      createdAt: row.created_on || "",
      productionDeadline: row.production_deadline || "",
      margin: toNumber(row.margin_percent),
      vat: parseVat(row.vat),
      note: row.note || "",
      items: itemsByQuote.get(row.id) || [],
      ...camelSyncFields(row)
    };
  });
}

function loadProfiles(db) {
  return db.prepare("SELECT * FROM profiles ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    manufacturer: row.manufacturer || "",
    name: row.name || "",
    category: row.category || "",
    uf: row.uf,
    ug2: row.ug2,
    ug3: row.ug3,
    note: row.note || "",
    ...camelSyncFields(row)
  }));
}

function loadExteriorOpenings(db) {
  return db.prepare("SELECT * FROM exterior_opening_types ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    name: row.name || "",
    productTypeId: row.product_type_id || "window",
    note: row.note || "",
    ...camelSyncFields(row)
  }));
}

function loadPriceMatrices(db) {
  const cellsByMatrix = db.prepare("SELECT * FROM price_matrix_cells ORDER BY matrix_id, width_mm, height_mm").all().reduce((map, row) => {
    if (!map.has(row.matrix_id)) map.set(row.matrix_id, []);
    map.get(row.matrix_id).push(row);
    return map;
  }, new Map());

  return db.prepare("SELECT * FROM price_matrices ORDER BY created_at, id").all().reduce((matrices, row) => {
    const widths = new Set();
    const heights = new Set();
    const prices = {};
    const blocked = {};
    (cellsByMatrix.get(row.id) || []).forEach((cell) => {
      widths.add(Number(cell.width_mm));
      heights.add(Number(cell.height_mm));
      const key = `${Number(cell.width_mm)}x${Number(cell.height_mm)}`;
      prices[key] = toNumber(cell.purchase_price_net);
      if (cell.is_blocked) blocked[key] = true;
    });

    matrices[row.id] = {
      widths: Array.from(widths).sort((left, right) => left - right),
      heights: Array.from(heights).sort((left, right) => left - right),
      prices,
      blocked
    };
    return matrices;
  }, {});
}

function loadColors(db) {
  return db.prepare("SELECT * FROM colors ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    name: row.name || "",
    type: row.price_type || "percent",
    outsideValue: toNumber(row.outside_value),
    bothValue: toNumber(row.both_value),
    ...camelSyncFields(row)
  }));
}

function loadGlasses(db) {
  return db.prepare("SELECT * FROM glasses ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    name: row.name || "",
    layers: toNumber(row.layers),
    ug: toNumber(row.ug),
    type: row.price_type || "percent",
    value: toNumber(row.value),
    ...camelSyncFields(row)
  }));
}

function loadExtensions(db) {
  return db.prepare("SELECT * FROM extensions ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    mm: toNumber(row.mm),
    pricePerM: toNumber(row.price_per_m),
    ...camelSyncFields(row)
  }));
}

function loadAccessories(db) {
  return db.prepare("SELECT * FROM accessories ORDER BY created_at, id").all().map((row) => ({
    id: row.id,
    category: row.category || "accessory",
    name: row.name || "",
    pricing: row.pricing || "fixed",
    price: toNumber(row.price),
    ...camelSyncFields(row)
  }));
}

function loadInteriorDoors(db) {
  const imagesByModel = db.prepare("SELECT * FROM item_images WHERE owner_type = 'interior_model'").all().reduce((map, row) => {
    if (!map.has(row.owner_id)) map.set(row.owner_id, {});
    map.get(row.owner_id)[row.color_id] = row.data_url || "";
    return map;
  }, new Map());

  return {
    manufacturers: db.prepare("SELECT * FROM interior_manufacturers ORDER BY created_at, id").all().map((row) => ({
      id: row.id,
      name: row.name || "",
      sizing: row.sizing || "custom",
      sizesText: row.sizes_text || "",
      note: row.note || "",
      ...camelSyncFields(row)
    })),
    models: db.prepare("SELECT * FROM interior_models ORDER BY created_at, id").all().map((row) => ({
      id: row.id,
      manufacturerId: row.manufacturer_id,
      name: row.name || "",
      decorPrice: toNumber(row.decor_price),
      cplPrice: toNumber(row.cpl_price),
      customFrameEnabled: Boolean(row.custom_frame_enabled),
      decorIncludedFrameCm: toNumber(row.decor_included_frame_cm),
      cplIncludedFrameCm: toNumber(row.cpl_included_frame_cm),
      customFrameSurchargePerCm: toNumber(row.custom_frame_surcharge_per_cm),
      note: row.note || "",
      images: imagesByModel.get(row.id) || {},
      ...camelSyncFields(row)
    })),
    colors: loadNamedRows(db, "interior_colors", false),
    frames: loadNamedRows(db, "interior_frames", true),
    handles: loadNamedRows(db, "interior_handles", true),
    locks: loadNamedRows(db, "interior_locks", true)
  };
}

function loadNamedRows(db, table, hasPrice) {
  return db.prepare(`SELECT * FROM ${table} ORDER BY created_at, id`).all().map((row) => ({
    id: row.id,
    name: row.name || "",
    ...(hasPrice ? { price: toNumber(row.price) } : {}),
    ...camelSyncFields(row)
  }));
}

function loadOpeningImages(db) {
  return db.prepare("SELECT * FROM item_images WHERE owner_type = 'exterior_opening'").all().reduce((images, row) => {
    images[row.owner_id] = row.data_url || "";
    return images;
  }, {});
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
          toNumber(matrix.prices?.[cellKey]),
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

function camelSyncFields(row) {
  const fields = {};
  if (row.external_id) fields.externalId = row.external_id;
  if (row.sync_status && row.sync_status !== "local") fields.syncStatus = row.sync_status;
  if (row.synced_at) fields.syncedAt = row.synced_at;
  return fields;
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

function parseVat(value) {
  return String(value).toUpperCase() === "FAD" ? "FAD" : toNumber(value);
}

module.exports = {
  createPendingSqliteAdapter,
  createSqliteAdapter,
  initializeDatabase,
  loadAppState,
  loadNormalizedState,
  saveAppState,
  persistState
};
