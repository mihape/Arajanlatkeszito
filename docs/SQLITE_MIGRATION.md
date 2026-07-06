# SQLite migration plan

Status: first normalized runtime bridge implemented. Electron can now create a local `app-state.sqlite` database in the user app data folder, apply the v1 schema, persist the full app-state JSON through preload IPC, and mirror the main records into normalized SQLite tables. The renderer still keeps `localStorage` as browser-preview fallback while SQLite is phased in.

## Target

- Main process owns SQLite.
- Renderer never opens the database directly.
- Renderer asks through preload API.
- JSON backup/export remains available before and after migration.
- CRM fields are present from the first schema version: `external_id`, `sync_status`, `synced_at`, `created_at`, `updated_at`.

## First schema

The executable schema draft lives in `src/shared/sqlite-schema.js`.

Core tables:

- `customers`
- `quotes`
- `quote_items`
- `profiles`
- `exterior_opening_types`
- `price_matrices`
- `price_matrix_cells`
- `colors`
- `glasses`
- `extensions`
- `accessories`
- `interior_manufacturers`
- `interior_models`
- `interior_colors`
- `interior_frames`
- `interior_handles`
- `interior_locks`
- `item_images`
- `sync_queue`

## Current JSON mapping

- `settings` -> `settings`
- `customers[]` -> `customers`
- `quotes[]` -> `quotes`
- `quotes[].items[]` -> `quote_items`, with the full item preserved in `payload_json` in version 1
- `catalog.profiles[]` -> `profiles`
- `catalog.exteriorOpenings[]` -> `exterior_opening_types`
- `catalog.matrices` -> `price_matrices` and `price_matrix_cells`
- `catalog.colors[]` -> `colors`
- `catalog.glasses[]` -> `glasses`
- `catalog.extensions[]` -> `extensions`
- `catalog.accessories[]` -> `accessories`
- `catalog.interiorDoors.manufacturers[]` -> `interior_manufacturers`
- `catalog.interiorDoors.models[]` -> `interior_models`
- `catalog.interiorDoors.colors[]` -> `interior_colors`
- `catalog.interiorDoors.frames[]` -> `interior_frames`
- `catalog.interiorDoors.handles[]` -> `interior_handles`
- `catalog.interiorDoors.locks[]` -> `interior_locks`
- `openingImages` and interior model color images -> `item_images`

## Migration steps

1. Export the current `localStorage` JSON through the existing backup action.
2. Create the SQLite database under the user app data folder.
3. Apply `MIGRATIONS` from `src/shared/sqlite-schema.js`.
4. Import JSON rows into the schema above.
5. Recalculate quote totals from imported rows and compare with the pre-migration JSON totals.
6. Switch renderer reads and writes to preload data methods.
7. Keep JSON backup export by reading from SQLite instead of from `localStorage`.

## Preload boundary

The first IPC boundary supports:

- `window.nyilaszaroApp.data.getStatus()`
- `window.nyilaszaroApp.data.loadState()`
- `window.nyilaszaroApp.data.saveState(state)`
- `window.nyilaszaroApp.data.importState(state)`
- `window.nyilaszaroApp.data.exportState()`
- `window.nyilaszaroApp.data.upsertCustomer(customer)`
- `window.nyilaszaroApp.data.deleteCustomer(id)`
- `window.nyilaszaroApp.data.upsertQuote(quote)`
- `window.nyilaszaroApp.data.deleteQuote(id)`

The current implementation stores one normalized full-state JSON document in the SQLite `settings` table under `app_state`, then mirrors the main state into normalized tables on every save/import.

Currently mirrored:

- customers
- quotes and quote items
- plastic profiles and exterior opening types
- price matrices and matrix cells, including non-manufacturable cells
- colors, glasses, extensions, accessories
- interior manufacturers, models, colors, frames, handles, locks
- uploaded exterior/interior images as `item_images`

Next implementation step:

- move catalog CRUD behind preload methods
- split customer and quote persistence into narrower table-level writes after the state round-trip is stable
- keep JSON backup as an export format generated from SQLite
