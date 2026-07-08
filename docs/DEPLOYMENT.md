# Deployment

## Goal

The production direction is a Windows installer for a standalone Electron app. The app must be usable without CRM access and without an internet connection after installation.

## Local Development

```bash
npm install
npm run dev
```

Development mode uses fictional demo records so screenshots and manual testing are easier.

Explicit mode launches:

```bash
npm run dev:demo
npm run dev:release
```

## Checks

```bash
npm run check
```

Current check scope:

- renderer syntax: `src/renderer/app.js`
- Electron main process syntax
- Electron preload syntax
- shared pricing/schema modules
- pricing calculation unit tests
- SQLite adapter persistence test

SQLite note: the current runtime bridge uses Node/Electron `node:sqlite`. In the current local Node version this prints an experimental warning during tests, but it avoids native package rebuilds and keeps the Windows installer path simpler.

## Windows Build

```bash
npm run build:win
```

Expected output:

- installer under `dist/`
- unpacked build artifacts under `dist/`

## WSL/Linux Validation Build

When running from WSL or Linux, the full NSIS installer step can require `wine`. To validate the Windows app package without creating the installer:

```bash
npm run build:win:dir
```

This should produce `dist/win-unpacked/`.

Current WSL note: in the 2026-07-03 local validation, `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` was produced, but the `build:win:dir` command did not exit within 300 seconds. Treat WSL artifacts as partial validation only.

The GitHub Actions workflow runs on `windows-latest`, so the tagged release installer path must be validated there instead of relying on WSL.

CI note: `npm run build:win` passes `--publish never`; GitHub release uploads are handled by the explicit `softprops/action-gh-release` step on `v*` tags.

Workflow artifact note: the Windows workflow uploads only top-level installer `.exe` files from `dist/` plus `CHECKSUMS.txt`; unpacked internal Electron executables are intentionally not release assets.

## Release Mode

Packaged builds should start in release mode. Release mode must not seed real or demo customers/quotes by default.

Current behavior:

- development Electron run: demo mode
- packaged Electron run: release mode
- browser fallback without query string: demo mode

CI validation:

- `npm run smoke:electron:release` starts Electron with an isolated temporary user data directory and verifies that no demo customer or demo quote is rendered.
- `npm run smoke:electron:demo` starts Electron with fictional demo data and verifies that `Demo Partner Kft.` and `AJ-2026-0001` render.
- Both smoke runs also verify that the SQLite adapter is ready and reports a database path.
- These checks run in the Windows build workflow before installer creation.
- `npm run smoke:packaged:release` runs after `npm run build:win` and starts the packaged `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` with the same release-mode no-demo-data and SQLite-ready checks.
- `npm run smoke:installer:release` runs the generated NSIS installer in silent mode into a temporary folder, then starts the installed executable with the same release-mode no-demo-data and SQLite-ready checks.
- `npm run smoke:installer:pdf` runs the silent-installed app in demo mode and verifies that customer/internal PDF files can be generated through Electron `printToPDF`.
- `npm run smoke:installer:backup` runs the silent-installed app twice with the same temporary user data directory. The first launch saves, exports and imports a fictional backup state; the second launch verifies that the imported customer/quote survived restart in SQLite.

## Demo Mode

Demo mode is allowed to include fictional sample data only.

Allowed examples:

- `Demo Partner Kft.`
- `Példa utca`
- `example.invalid`

Not allowed:

- real customer names
- real addresses
- real tax numbers
- real purchase prices
- real supplier price lists
- exported real PDFs

## GitHub Release Assets

Target release assets:

- `Nyilaszaro-Ajanlatkeszito-Setup-<version>.exe`
- `CHECKSUMS.txt`

The first RC/release direction is a clean installer that starts with an empty local database. If sample data is needed for testing or onboarding, keep it fictional and provide it as a separate documented import/example flow instead of preloading the production installer.

Use [RC testing guide](TESTING-RC.md) for the empty first-run, setup flow and PDF validation scenario.

## Manual Windows Validation

Use [Windows validation checklist](WINDOWS_VALIDATION.md) after a successful GitHub Actions `Build Windows` run. The checklist covers installer download, release/demo startup, SQLite file creation, PDF export and backup restore.

The repository also includes a helper command for Windows:

```bash
npm run validate:windows -- --installer "C:\Path\To\Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe" --checksums "C:\Path\To\CHECKSUMS.txt"
```
