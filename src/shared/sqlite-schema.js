const SCHEMA_VERSION = 1;

const syncColumns = `
  external_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'local',
  synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
`;

const MIGRATIONS = [
  {
    version: 1,
    name: "initial-local-quote-schema",
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        note TEXT,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS quotes (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL,
        customer_id TEXT,
        project_address TEXT,
        status TEXT NOT NULL,
        created_on TEXT,
        production_deadline TEXT,
        margin_percent REAL NOT NULL DEFAULT 0,
        vat TEXT NOT NULL DEFAULT '27',
        note TEXT,
        ${syncColumns},
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS quote_items (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        product_type_id TEXT NOT NULL,
        opening_type_id TEXT,
        profile_id TEXT,
        width_mm REAL,
        height_mm REAL,
        quantity REAL NOT NULL DEFAULT 1,
        payload_json TEXT NOT NULL,
        ${syncColumns},
        FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        manufacturer TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        uf REAL,
        ug2 REAL,
        ug3 REAL,
        note TEXT,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS exterior_opening_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        product_type_id TEXT NOT NULL,
        note TEXT,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS price_matrices (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL,
        opening_type_id TEXT NOT NULL,
        raster_mm INTEGER NOT NULL DEFAULT 100,
        ${syncColumns},
        FOREIGN KEY (profile_id) REFERENCES profiles(id),
        FOREIGN KEY (opening_type_id) REFERENCES exterior_opening_types(id)
      )`,
      `CREATE TABLE IF NOT EXISTS price_matrix_cells (
        id TEXT PRIMARY KEY,
        matrix_id TEXT NOT NULL,
        width_mm INTEGER NOT NULL,
        height_mm INTEGER NOT NULL,
        purchase_price_net REAL NOT NULL DEFAULT 0,
        is_blocked INTEGER NOT NULL DEFAULT 0,
        block_reason TEXT,
        ${syncColumns},
        UNIQUE(matrix_id, width_mm, height_mm),
        FOREIGN KEY (matrix_id) REFERENCES price_matrices(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS colors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_type TEXT NOT NULL DEFAULT 'percent',
        outside_value REAL NOT NULL DEFAULT 0,
        both_value REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS glasses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        layers INTEGER,
        ug REAL,
        price_type TEXT NOT NULL DEFAULT 'percent',
        value REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS extensions (
        id TEXT PRIMARY KEY,
        mm INTEGER NOT NULL,
        price_per_m REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS accessories (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        pricing TEXT NOT NULL DEFAULT 'fixed',
        price REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS interior_manufacturers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sizing TEXT NOT NULL DEFAULT 'custom',
        sizes_text TEXT,
        note TEXT,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS interior_models (
        id TEXT PRIMARY KEY,
        manufacturer_id TEXT NOT NULL,
        name TEXT NOT NULL,
        decor_price REAL NOT NULL DEFAULT 0,
        cpl_price REAL NOT NULL DEFAULT 0,
        custom_frame_enabled INTEGER NOT NULL DEFAULT 0,
        decor_included_frame_cm REAL NOT NULL DEFAULT 0,
        cpl_included_frame_cm REAL NOT NULL DEFAULT 0,
        custom_frame_surcharge_per_cm REAL NOT NULL DEFAULT 0,
        note TEXT,
        ${syncColumns},
        FOREIGN KEY (manufacturer_id) REFERENCES interior_manufacturers(id)
      )`,
      `CREATE TABLE IF NOT EXISTS interior_colors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS interior_frames (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS interior_handles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS interior_locks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS item_images (
        id TEXT PRIMARY KEY,
        owner_type TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        color_id TEXT,
        file_path TEXT,
        data_url TEXT,
        ${syncColumns}
      )`,
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`
    ]
  }
];

module.exports = {
  SCHEMA_VERSION,
  MIGRATIONS
};
