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
  "complete_quote_categories",
  "complete_quote_templates",
  "complete_quotes",
  "complete_quote_sections",
  "complete_quote_items",
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
  DELETE_QUOTE: "data:delete-quote",
  UPSERT_COMPLETE_QUOTE: "data:upsert-complete-quote",
  DELETE_COMPLETE_QUOTE: "data:delete-complete-quote",
  UPSERT_COMPLETE_CATEGORY: "data:upsert-complete-category",
  ARCHIVE_COMPLETE_CATEGORY: "data:archive-complete-category",
  UPSERT_COMPLETE_TEMPLATE: "data:upsert-complete-template",
  ARCHIVE_COMPLETE_TEMPLATE: "data:archive-complete-template"
});

const PDF_CHANNELS = Object.freeze({
  EXPORT_QUOTE: "pdf:export-quote",
  EXPORT_COMPLETE_QUOTE: "pdf:export-complete-quote"
});

module.exports = {
  STORAGE_VERSION,
  TABLES,
  SYNC_FIELDS,
  SYNC_STATUS,
  DATA_CHANNELS,
  PDF_CHANNELS
};
