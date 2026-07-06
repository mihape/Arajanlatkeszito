const CRM_SYNC_STATUS = Object.freeze({
  LOCAL: "local",
  PENDING: "pending",
  SYNCED: "synced",
  FAILED: "failed"
});

const CRM_ADAPTERS = Object.freeze([
  "authTenantAdapter",
  "partnerAdapter",
  "projectAdapter",
  "catalogAdapter",
  "quoteStorageAdapter",
  "exportAdapter",
  "moduleManifestAdapter"
]);

const CRM_CAPABILITIES = Object.freeze([
  "customers.read",
  "customers.write",
  "quotes.read",
  "quotes.write",
  "quotes.statusHistory",
  "quotes.pdf.customer",
  "quotes.pdf.internal",
  "catalog.read",
  "sync.queue"
]);

function createCrmManifest(overrides = {}) {
  return {
    appId: "nyilaszaro-ajanlatkeszito",
    name: "Nyilaszaro Ajanlatkeszito",
    version: overrides.version || "0.1.0",
    mode: overrides.mode || "local-first",
    adapters: [...CRM_ADAPTERS],
    capabilities: [...CRM_CAPABILITIES],
    syncFields: ["externalId", "syncStatus", "syncedAt", "createdAt", "updatedAt"],
    ...overrides
  };
}

function createSyncEnvelope(recordType, record, operation = "upsert") {
  return {
    recordType,
    operation,
    localId: record?.id || "",
    externalId: record?.externalId || null,
    syncStatus: record?.syncStatus || CRM_SYNC_STATUS.LOCAL,
    updatedAt: record?.updatedAt || record?.createdAt || null,
    payload: record || {}
  };
}

function markSyncPending(record) {
  return {
    ...record,
    syncStatus: CRM_SYNC_STATUS.PENDING,
    syncedAt: record?.syncedAt || null
  };
}

function markSyncSucceeded(record, externalId, syncedAt = new Date().toISOString()) {
  return {
    ...record,
    externalId: externalId || record?.externalId || null,
    syncStatus: CRM_SYNC_STATUS.SYNCED,
    syncedAt
  };
}

function markSyncFailed(record, syncError) {
  return {
    ...record,
    syncStatus: CRM_SYNC_STATUS.FAILED,
    syncError: syncError ? String(syncError) : "Unknown CRM sync error"
  };
}

module.exports = {
  CRM_SYNC_STATUS,
  CRM_ADAPTERS,
  CRM_CAPABILITIES,
  createCrmManifest,
  createSyncEnvelope,
  markSyncPending,
  markSyncSucceeded,
  markSyncFailed
};
