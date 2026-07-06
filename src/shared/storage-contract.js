const STORAGE_VERSION = 1;

const TABLES = Object.freeze([
  "settings",
  "customers",
  "quotes",
  "quote_items",
  "profiles",
  "exterior_opening_types",
  "price_matrices",
  "price_matrix_cells",
  "colors",
  "glasses",
  "extensions",
  "accessories",
  "interior_manufacturers",
  "interior_models",
  "interior_colors",
  "interior_frames",
  "interior_handles",
  "interior_locks",
  "item_images",
  "sync_queue"
]);

const SYNC_FIELDS = Object.freeze([
  "external_id",
  "sync_status",
  "synced_at",
  "created_at",
  "updated_at"
]);

const SYNC_STATUS = Object.freeze({
  LOCAL: "local",
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed"
});

const DATA_CHANNELS = Object.freeze({
  GET_STATUS: "data:get-status",
  LOAD_STATE: "data:load-state",
  SAVE_STATE: "data:save-state",
  IMPORT_STATE: "data:import-state",
  EXPORT_STATE: "data:export-state",
  UPSERT_CUSTOMER: "data:upsert-customer",
  DELETE_CUSTOMER: "data:delete-customer",
  UPSERT_QUOTE: "data:upsert-quote",
  DELETE_QUOTE: "data:delete-quote"
});

module.exports = {
  STORAGE_VERSION,
  TABLES,
  SYNC_FIELDS,
  SYNC_STATUS,
  DATA_CHANNELS
};
