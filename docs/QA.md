# QA Notes

## 2026-07-03 Electron and render smoke

Environment:

- WSL2 workspace
- Node.js `22.22.1`
- npm lockfile generated
- Electron `43.0.0`
- electron-builder `26.15.3`
- Browser plugin unavailable; Chrome headless CLI fallback used for rendered smoke checks

## Commands

Passed:

```bash
npm install
npm run check
npm audit --audit-level=moderate
```

Results:

- dependencies installed
- `package-lock.json` generated
- syntax checks passed
- audit reported 0 vulnerabilities

## Electron Runtime Check

Command:

```bash
env TMPDIR=/tmp ELECTRON_CACHE=/tmp/electron-cache npx electron --version
```

Result:

- Electron binary downloaded
- local WSL runtime could not launch Electron because `libnspr4.so` is missing

Interpretation:

- this is a local Linux/WSL runtime dependency issue, not an application syntax issue
- Windows startup still needs to be validated on Windows or GitHub `windows-latest`

## Windows Build Check

Command:

```bash
npm run build:win
```

Result:

- Electron Windows package reached `dist/win-unpacked`
- NSIS installer step failed under WSL because `wine` is not installed

Command:

```bash
timeout 300 npm run build:win:dir
```

Result:

- `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` exists
- file type: `PE32+ executable (GUI) x86-64, for MS Windows`
- the command did not exit within 300 seconds in this WSL environment

Interpretation:

- local WSL produced unpacked Windows artifacts, but build command completion is not proven
- full installer validation remains assigned to the GitHub Actions Windows workflow

## Rendered Smoke Check

Local server:

```bash
python3 -m http.server 5173
```

Release URL:

```text
http://127.0.0.1:5173/src/renderer/index.html?mode=release
```

Observed:

- app shell rendered
- dashboard rendered
- quote count: `0 db`
- empty table text: `Még nincs ajánlat.`
- no `Demo Partner Kft.` text

Screenshot:

- `/mnt/c/Users/mihal/Documents/nyilaszaro-release-smoke.png`

Demo URL:

```text
http://127.0.0.1:5173/src/renderer/index.html?mode=demo
```

Observed:

- app shell rendered
- demo mode label rendered
- `Demo Partner Kft.` rendered
- `AJ-2026-0001` rendered
- quote count: `1 db`
- print sheet content rendered in DOM

Screenshot:

- `/mnt/c/Users/mihal/Documents/nyilaszaro-demo-smoke.png`

## Untested / Follow-up

- interactive click flow could not be automated because Chrome DevTools Protocol was not reachable reliably from this WSL setup
- Electron window startup needs Windows validation
- NSIS installer needs GitHub Actions Windows validation
- PDF layout should still be visually checked on Windows after Electron `printToPDF` file export

## 2026-07-06 PDF export check

Implemented:

- Electron PDF export channel: `pdf:export-quote`
- Renderer customer/internal PDF buttons call preload PDF export when available.
- Browser preview keeps `window.print()` fallback.
- PDF default file names are sanitized for Windows file systems.

Validated:

```bash
npm run check
```

Remaining manual QA:

- Save customer PDF from the installed Windows app.
- Save internal PDF from the installed Windows app.
- Verify customer PDF hides purchase price and internal PDF shows purchase price/margin.
- Verify multipage quote layout with uploaded opening images.

## 2026-07-06 Windows manual validation support

Added:

- `npm run dev:demo`
- `npm run dev:release`
- `docs/WINDOWS_VALIDATION.md`

Purpose:

- make release/demo launch checks reproducible on Windows
- provide a copyable issue result template for #15/#2
- keep manual installer validation separate from GitHub Actions build validation

## 2026-07-07 Windows artifact validation

Run:

- GitHub Actions `Build Windows` run `28843882287`
- Artifact: `nyilaszaro-windows-build`

Result:

- workflow passed on commit `60f895fa45a0f8c09b4b7f0898c9f92f97768951`
- artifact downloaded successfully
- artifact contains `Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- artifact contains `CHECKSUMS.txt`
- installer file type: `PE32 executable (GUI) Intel 80386, for MS Windows, Nullsoft Installer self-extracting archive`
- installer SHA256 matched `CHECKSUMS.txt`

Observed SHA256:

```text
645335618a22aa1a1576855e263d55c62a88ae4345d6325b193f82fae9a0e02e
```

Not completed from this WSL session:

- manual GUI installer launch
- installed app startup
- installed app PDF save/open flow

Reason:

```text
WSL (2 - ) ERROR: UtilBindVsockAnyPort:307: socket failed 1
```

## 2026-07-07 Matrix import validation check

Implemented:

- `src/shared/matrix-import.js`
- CSV/TSV parser with header-based and no-header modes
- missing cell validation
- invalid price validation
- blocked/non-manufacturable cell markers: `x`, `nem`, `tilt`, `blocked`, `-`, `n/a`
- renderer import report before saving invalid imports

Validated:

```bash
npm run check
```

## 2026-07-07 Public repo safety audit

Scope:

- current tracked files
- Git history file names
- ignored/generated local artifacts
- demo data strings
- release/tag state

Commands/evidence:

- `git ls-files`: 44 tracked files, all source/docs/config/test files.
- Tracked artifact search found no `.db`, `.sqlite`, `.pdf`, `.xlsx`, `.xls`, `.csv`, `.tsv`, archive, backup JSON or handoff files.
- `git log --all --name-only` search found no historical handoff, database, backup, PDF, spreadsheet or archive file names.
- Targeted filename checks returned no matches:
  - `git ls-files | rg -n '\.(db|sqlite|sqlite3|pdf|xlsx|xls|csv|tsv|zip|7z|rar|bak)$|backup|mentes|handoff|HANDOFF|ARAJANLAT_KESZITO_HANDOFF'`
  - `git log --all --name-only --pretty=format: | sort -u | rg -n '\.(db|sqlite|sqlite3|pdf|xlsx|xls|csv|tsv|zip|7z|rar|bak)$|backup|mentes|handoff|HANDOFF|ARAJANLAT_KESZITO_HANDOFF'`
- `.gitignore` covers `dist/`, `.tmp-tests/`, local SQLite/database files, backup JSON files, logs and handoff notes.
- Demo-data search found only fictional data and documentation/test references:
  - `Demo Partner Kft.`
  - `Példa utca`
  - `example.invalid`
  - dummy `+36 30 000 0000/0001` phone values
- No Git tags exist yet, so no first tagged release has been created.

Local ignored artifacts:

- `.tmp-tests/` contains generated SQLite files from adapter tests.
- These files are ignored and not part of the public repository.

Latest recheck:

- date: 2026-07-07
- commit: `c9b949a`
- `npm run check` passed locally.
- Latest code-bearing Windows workflow passed on commit `f372186f1a7217a2b2295ee2b35b91d6a3f4c89d`: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28861756774`
- That workflow `npm ci` reported 0 vulnerabilities.

Result:

- Current repository content is public-repo safe based on tracked files and Git history file-name checks.
- Final #1 release gate should remain open until the actual first tagged release is prepared and reviewed one more time.

## 2026-07-10 RC4 Windows validation and user smoke

Release:

- `v0.1.0-rc4`
- https://github.com/mihape/Arajanlatkeszito/releases/tag/v0.1.0-rc4

Workflow:

- GitHub Actions `Build Windows` run `29077407834`
- Result: success

Automated validation:

- `npm run check` passed locally before tagging.
- `npm audit --audit-level=moderate` reported 0 vulnerabilities.
- Windows workflow passed:
  - Electron release smoke
  - Electron demo smoke
  - Windows installer build
  - packaged release app smoke
  - silent installed app smoke
  - installed app PDF export smoke
  - installed app backup/restart smoke
  - checksum generation
  - artifact and release asset upload

Release assets:

- `Nyilaszaro.Ajanlatkeszito.Setup.0.1.0.exe`
- `CHECKSUMS.txt`

Manual Windows observation from the owner:

- installer completed successfully
- installed app starts and works
- customer creation works
- customer data persists after restart
- quote creation works
- quote item creation works
- quote and item data persist after restart

Result:

- #15 manual Windows installer/runtime validation is considered complete for the current RC scope.
- Remaining PDF/layout and UX refinements should be tracked as product follow-up issues, not as release-blocking installer validation.

## 2026-07-10 RC field testing and quote workflow polish

Implemented under #28:

- #32: quote item `Helyiseg` and `Pozicio / jel` metadata.
- #30: quote item sections with editor and PDF grouped subtotals.
- #29: clearer customer/internal PDF export actions.
- #33: first customer presentation view MVP.
- #31: RC testing documentation aligned with the new testing flow.

Validation:

```bash
npm run check
```

Result:

- renderer smoke tests cover item metadata, grouped section totals, PDF export labels and customer presentation mode.
- pricing, SQLite adapter, PDF channel, CRM contract, matrix import and installer helper tests remain green.

Next RC build focus:

- create the next tagged RC after #31 is closed.
- validate installer startup with existing local test data.
- manually try: item room/position, sections, customer/internal PDF export, customer view toggle.

## 2026-07-10 Professional configurator slice

Implemented under #34:

- #36: exterior item opening direction metadata with `Balos`, `Jobbos` and `Nincs / fix`, plus left/right generated SVG drawing cues.
- #35: guided quote item configurator workflow with step status, calculation strip and grouped exterior/interior form sections.
- #39: shared item visual rendering for editor, customer presentation and PDF, with uploaded image vs generated drawing fallback labels.
- #38: pre-export readiness checks for missing customer/address/items, blocked matrix cells and incomplete item metadata.
- #37: RC testing documentation updated for the professional configurator checks.

Validation:

```bash
npm run check
npm audit --audit-level=moderate
```

Result:

- renderer smoke tests cover the workflow UI, export readiness block, generated drawing fallback, room/position metadata, opening direction and customer presentation mode.
- pricing, SQLite adapter, PDF channel, CRM contract, matrix import, Windows validation helper, Electron smoke and installer helper tests remain green.
- audit reported 0 vulnerabilities.

Next RC manual focus:

- create and install the next RC build after #37 closes.
- verify `Balos`/`Jobbos` drawing direction in the installed Windows app.
- verify the guided item configurator remains fast for repeated item entry.
- verify customer PDF shows sales prices, visual drawing/image, section totals and readiness warnings without purchase price/margin.
- verify internal PDF still shows purchase price and margin/fedezet.
- verify uploaded opening/interior images and generated drawing fallback render acceptably in PDF.

## 2026-07-07 Windows validation helper

Implemented:

- `npm run validate:windows`
- `scripts/windows-validate.js`
- `tests/windows-validation.test.js`

Purpose:

- verify downloaded installer presence
- compare installer SHA256 with `CHECKSUMS.txt`
- report likely installed app path
- report expected SQLite path under `%APPDATA%`
- optionally launch the installed app with `--launch`

The helper still requires a human to observe the app window and complete PDF/backup checks.

## 2026-07-06 Dashboard workflow check

Implemented:

- quote dashboard search field
- quote dashboard status filter
- quote dashboard customer/date/deadline filters
- quote version and updated date display
- quote status history summary
- version/status history preservation through normalized SQLite state rebuild

Validated:

```bash
npm run check
```

## 2026-07-06 CRM contract check

Implemented:

- `src/shared/crm-contract.js`
- adapter boundary names
- capability manifest
- sync envelope shape
- immutable sync status helpers

Validated:

```bash
npm run check
```

## 2026-07-03 GitHub Actions attempt

Run:

- `28646511245`

Result:

- dependency install passed
- `npm run check` passed
- Windows unpacked app and NSIS installer were built
- workflow failed because electron-builder tried implicit GitHub publishing in CI without `GH_TOKEN`

Fix applied:

- changed `build:win` to `electron-builder --win nsis --publish never`
- changed GitHub Actions dependency install from `npm install` to `npm ci`

Next:

## 2026-07-03 renderer move follow-up

The Electron renderer was moved from the project root into `src/renderer/`.

Current browser fallback URLs:

```text
http://127.0.0.1:5173/src/renderer/index.html?mode=release
http://127.0.0.1:5173/src/renderer/index.html?mode=demo
```

Electron `main` now loads `src/renderer/index.html` directly.

## 2026-07-03 automated renderer smoke fallback

Windows interop from the current WSL session failed with:

```text
UtilBindVsockAnyPort:307: socket failed 1
```

Because Windows Chrome and PowerShell could not be launched from WSL, the rendered screenshot smoke could not be repeated locally in this session.

Fallback added:

```bash
npm run check
```

This now also runs `tests/render-smoke.test.js`, which loads `src/shared/pricing-calculations.js` before `src/renderer/app.js` in a minimal browser-like VM and verifies:

- release mode has no `Demo Partner Kft.` or `AJ-2026-0001`
- demo mode contains `Demo Partner Kft.`
- demo mode contains `AJ-2026-0001`
- the renderer script order is correct

- rerun `Build Windows` workflow on `main`

## 2026-07-03 GitHub Actions success

Run:

- `28646666889`

Result:

- `npm ci` passed
- `npm run check` passed
- Windows installer build passed
- checksum generation passed
- artifact upload passed
- artifact `nyilaszaro-windows-build` was created

Artifact verification:

- `Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- `CHECKSUMS.txt`
- downloaded artifact included a valid NSIS installer executable

Follow-up:

- workflow artifact glob was narrowed after this run so future artifacts and release assets include only top-level installer `.exe` files plus `CHECKSUMS.txt`

## 2026-07-07 Electron CI Smoke Gate

Added Windows workflow steps:

```bash
npm run smoke:electron:release
npm run smoke:electron:demo
npm run build:win
npm run smoke:packaged:release
npm run smoke:installer:release
npm run smoke:installer:pdf
```

The smoke mode starts Electron with a temporary user data directory and prints:

```text
NYILASZARO_ELECTRON_SMOKE_RESULT {...}
```

Release-mode expectations:

- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite adapter reports `ready: true`
- SQLite database path is present

Demo-mode expectations:

- dashboard rendered
- `Demo Partner Kft.` rendered
- `AJ-2026-0001` rendered
- SQLite adapter reports `ready: true`
- SQLite database path is present

Packaged-release expectations:

- `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` exists after `npm run build:win`
- packaged app starts on the Windows runner
- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite adapter reports `ready: true`
- SQLite database path is present

Installer-release expectations:

- generated `dist/*Setup*.exe` exists after `npm run build:win`
- NSIS setup exits successfully in silent mode
- installed `Nyilaszaro Ajanlatkeszito.exe` appears in the temporary install folder
- installed app starts on the Windows runner
- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite adapter reports `ready: true`
- SQLite database path is present

Installed-app PDF expectations:

- NSIS setup exits successfully in silent mode
- installed app starts in demo mode
- demo quote print sheet is rendered
- customer PDF file is written
- internal PDF file is written
- generated PDF files are non-empty

This closes part of the Electron startup and PDF file-generation risk in CI for development Electron, the unpacked packaged executable and a silent-installed executable. The app still needs manual Windows validation for visible installer launch, shortcut/Start menu launch, PDF visual layout and backup restore.

Verified run:

- run: `28861756774`
- URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28861756774`
- commit: `f372186f1a7217a2b2295ee2b35b91d6a3f4c89d`
- result: success
- artifact: `nyilaszaro-windows-build`, artifact ID `8135984785`
- uploaded files: installer `.exe` and `CHECKSUMS.txt`
- artifact URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28861756774/artifacts/8135984785`

Release smoke JSON summary:

- `ok: true`
- `mode: release`
- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite `engine: node:sqlite`
- SQLite `ready: true`

Demo smoke JSON summary:

- `ok: true`
- `mode: demo`
- dashboard rendered
- `Demo Partner Kft.` rendered
- `AJ-2026-0001` rendered
- SQLite `engine: node:sqlite`
- SQLite `ready: true`

Packaged release verified run:

- run: `28862457145`
- URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28862457145`
- commit: `f7f0564a3262a064f852615986e962fd3e41bdf0`
- result: success
- artifact: `nyilaszaro-windows-build`, artifact ID `8136258349`
- artifact URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28862457145/artifacts/8136258349`

Packaged release smoke JSON summary:

- `ok: true`
- `mode: release`
- `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` started on the Windows runner
- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite `engine: node:sqlite`
- SQLite `ready: true`

Silent installer verified run:

- run: `28862940676`
- URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28862940676`
- commit: `c2954da6af2113c35e77e9a7a4ce47cdf59ce8f9`
- result: success
- artifact: `nyilaszaro-windows-build`, artifact ID `8136456184`
- artifact URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28862940676/artifacts/8136456184`

Silent installer smoke evidence:

- installer: `dist/Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- installer mode: silent
- install target: temporary Windows runner folder
- installed app: `Nyilaszaro Ajanlatkeszito.exe`
- installed app launched successfully from the temporary install folder
- `ok: true`
- `mode: release`
- dashboard rendered
- empty quote state rendered
- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- SQLite `engine: node:sqlite`
- SQLite `ready: true`

## 2026-07-03 GitHub Actions final artifact validation

Run:

- `28646967700`

Commit:

- `4d07d64`

Result:

- `npm ci` passed
- `npm run check` passed
- Windows installer build passed
- checksum generation passed
- artifact upload passed

Downloaded artifact contents:

- `Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- `CHECKSUMS.txt`

Installer file check:

```text
PE32 executable (GUI) Intel 80386, for MS Windows, Nullsoft Installer self-extracting archive
```

Checksum file:

```text
4734D892943F4B0F17D343B454F84259CD09DD454C8FC1BA1EFA95B055CB7820  Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe
```

Conclusion:

- Windows CI installer build and artifact upload are validated on GitHub Actions.
- The release upload path still needs one tagged `v*` release validation.

## 2026-07-08 Installed app PDF smoke validation

Run:

- GitHub Actions `Build Windows` run `28919480974`
- URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28919480974`
- Commit: `7793b367fdd0df082e2e6906a26db53c8042a7fc`
- Artifact: `nyilaszaro-windows-build`, artifact ID `8158904452`

Result:

- workflow passed on Windows Server 2025
- `npm ci` reported 0 vulnerabilities
- `npm run check` passed on Windows
- Electron release smoke passed with an empty dashboard, no demo customer and SQLite ready
- Electron demo smoke passed with fictional demo data
- packaged unpacked app smoke passed
- silent NSIS installer smoke passed in release mode
- installed app PDF smoke passed in demo mode

Installed app PDF evidence:

- installer: `dist\Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- installed app launched from the temporary install folder
- SQLite engine: `node:sqlite`
- SQLite ready: true
- customer PDF: `.tmp-tests\installer-pdf-smoke\smoke-customer.pdf`, 45901 bytes
- internal PDF: `.tmp-tests\installer-pdf-smoke\smoke-internal.pdf`, 46891 bytes
- both PDF modes rendered a print sheet
- both PDF modes included demo quote number `AJ-2026-0001`
- both PDF modes included the gross total text
- PDF smoke returned no errors

Still not completed from this automated CI pass:

- visible installer wizard/shortcut or Start menu launch on a real Windows desktop
- human visual review of the customer/internal PDF layout

## 2026-07-08 Installed app backup restart smoke validation

Run:

- GitHub Actions `Build Windows` run `28923097495`
- URL: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28923097495`
- Commit: `ec9555ea84ce4ad880c8f126b211e76a353db197`
- Artifact: `nyilaszaro-windows-build`, artifact ID `8160274788`

Result:

- workflow passed on Windows Server 2025
- `npm ci` reported 0 vulnerabilities
- `npm run check` passed on Windows
- Electron release/demo smoke passed
- Windows installer build passed
- packaged release app smoke passed
- silent installer release smoke passed
- installed app PDF smoke passed
- installed app backup restart smoke passed

Backup restart evidence:

- command: `npm run smoke:installer:backup`
- installer: `dist\Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
- installed app launched from a temporary install folder
- both backup launches used the same temporary user data folder
- write launch saved, exported and imported fictional backup data
- write launch result: `ok: true`, `loadedCustomerCount: 2`, `loadedQuoteCount: 2`
- verify launch result after restart: `ok: true`, `loadedCustomerCount: 2`, `loadedQuoteCount: 2`, `exportedCustomerCount: 2`
- SQLite after restart reported `settings: 1`, `customers: 2`, `quotes: 2`
- backup smoke returned no errors

Still not completed from this automated CI pass:

- visible installer wizard/shortcut or Start menu launch on a real Windows desktop
- human visual review of the customer/internal PDF layout

## 2026-07-08 Public repo safety recheck after smoke gates

Scope:

- current tracked files at `d5b028953b38c2508fa0cc84cde079b5c4e14162`
- Git history file names
- ignored/generated local artifact patterns
- demo/smoke data strings
- tag state

Evidence:

- worktree was clean before the check
- tracked files are source, docs, config, tests and package files only
- tracked filename search found no database, SQLite file, PDF, spreadsheet, CSV/TSV, archive, backup JSON or handoff file
- Git history filename search found no database, SQLite file, PDF, spreadsheet, CSV/TSV, archive, backup JSON or handoff file
- `.gitignore` covers `dist/`, `.tmp-tests/`, local SQLite/database files, backup JSON files, logs and handoff notes
- demo/smoke content search found only fictional values:
  - `Demo Partner Kft.`
  - `Példa utca`
  - `example.invalid`
  - dummy `+36 30 000 0000/0001` phone values
  - `Smoke Teszt Kft.`
  - `Smoke Importalt Kft.`
- no Git tags exist yet

Validation:

```bash
npm run check
npm audit --audit-level=moderate
```

Results:

- `npm run check` passed locally
- `npm audit --audit-level=moderate` passed with 0 vulnerabilities
- latest Build Windows workflow passed on commit `ec9555ea84ce4ad880c8f126b211e76a353db197`: `https://github.com/mihape/Arajanlatkeszito/actions/runs/28923097495`

Conclusion:

- Current repository content remains public-repo safe based on tracked files, Git history filename checks and targeted fictional-data search.
- Final #1 release gate should still remain open until the actual first tagged release is prepared and reviewed against the exact release commit.
