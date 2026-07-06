# CRM Integration Plan

## Goal

Prepare the standalone quote builder so it can later connect to a CRM without rewriting the core application.

## Adapter Boundaries

These boundaries are represented by `src/shared/crm-contract.js` as a stable contract. The current app still runs local-first; the contract prevents future CRM code from leaking directly into renderer pricing or UI logic.

- `authTenantAdapter`: current company, organization, office, and future user context.
- `partnerAdapter`: local saved customers now, CRM clients later.
- `projectAdapter`: local project labels now, CRM jobs/projects later.
- `catalogAdapter`: local products, profiles, accessories, and service templates now, CRM price list later.
- `quoteStorageAdapter`: local SQLite now, CRM quote endpoint later.
- `exportAdapter`: local PDF/JSON export now, CRM document service later.
- `moduleManifestAdapter`: exposes app capabilities for future CRM host integration.

## Current Contract Module

`src/shared/crm-contract.js` defines:

- adapter names
- supported capability names
- sync status values: `local`, `pending`, `synced`, `failed`
- `createCrmManifest()`
- `createSyncEnvelope()`
- immutable helper functions for pending/succeeded/failed sync states

The contract is intentionally provider-neutral. A future CRM connector should translate this manifest/envelope shape into the actual CRM API shape.

## Local-To-CRM Mapping

| Local field | Future CRM field |
| --- | --- |
| `customerId` | CRM client/customer id |
| `projectAddress` | CRM project/job address |
| `number` | CRM quote number or imported external quote number |
| `status` | CRM quote status/activity |
| `items` | CRM quote lines or project budget lines |
| `createdAt` | CRM created date |
| `updatedAt` | CRM updated date |
| PDF export | CRM document |

## Required Future Fields

When SQLite is added, include these fields on syncable records:

- `external_id`
- `sync_status`
- `synced_at`
- `created_at`
- `updated_at`

Optional tenant fields:

- `org_uid`
- `office_uid`
- `created_by`

## Future CRM Workflows

- Accepted quote can create or update a CRM project.
- Quote PDF can be stored as a CRM document.
- Quote items can become project budget lines.
- Quote status changes can create CRM activity entries.
- CRM mode should read customer/project master data from CRM APIs.

## Current Gap

The current app still reads most catalog and quote details through local renderer state, with customer/quote persistence and backups already moving behind preload/SQLite APIs. CRM integration itself is not implemented yet; the next CRM step is to build a provider-neutral sync queue adapter around the existing SQLite `sync_queue` table and the shared CRM contract.
