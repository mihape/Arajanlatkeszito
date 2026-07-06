const assert = require("assert");
const {
  CRM_ADAPTERS,
  CRM_SYNC_STATUS,
  createCrmManifest,
  createSyncEnvelope,
  markSyncFailed,
  markSyncPending,
  markSyncSucceeded
} = require("../src/shared/crm-contract");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("CRM manifest exposes stable adapter boundaries and capabilities", () => {
  const manifest = createCrmManifest({ version: "1.2.3", mode: "desktop" });

  assert.equal(manifest.version, "1.2.3");
  assert.equal(manifest.mode, "desktop");
  assert(CRM_ADAPTERS.includes("partnerAdapter"));
  assert(manifest.adapters.includes("quoteStorageAdapter"));
  assert(manifest.capabilities.includes("quotes.pdf.customer"));
  assert(manifest.capabilities.includes("quotes.statusHistory"));
  assert.deepEqual(manifest.syncFields, ["externalId", "syncStatus", "syncedAt", "createdAt", "updatedAt"]);
});

test("CRM sync envelope keeps local and external identifiers separate", () => {
  const envelope = createSyncEnvelope("quote", {
    id: "quote-1",
    externalId: "crm-quote-9",
    syncStatus: CRM_SYNC_STATUS.PENDING,
    updatedAt: "2026-07-06"
  });

  assert.equal(envelope.recordType, "quote");
  assert.equal(envelope.operation, "upsert");
  assert.equal(envelope.localId, "quote-1");
  assert.equal(envelope.externalId, "crm-quote-9");
  assert.equal(envelope.syncStatus, "pending");
  assert.equal(envelope.updatedAt, "2026-07-06");
});

test("CRM sync status helpers are immutable", () => {
  const record = { id: "customer-1", name: "Demo" };
  const pending = markSyncPending(record);
  const synced = markSyncSucceeded(pending, "crm-customer-1", "2026-07-06T10:00:00.000Z");
  const failed = markSyncFailed(synced, "API timeout");

  assert.equal(record.syncStatus, undefined);
  assert.equal(pending.syncStatus, "pending");
  assert.equal(synced.syncStatus, "synced");
  assert.equal(synced.externalId, "crm-customer-1");
  assert.equal(synced.syncedAt, "2026-07-06T10:00:00.000Z");
  assert.equal(failed.syncStatus, "failed");
  assert.equal(failed.syncError, "API timeout");
});
