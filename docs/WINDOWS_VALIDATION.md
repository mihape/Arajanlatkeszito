# Windows validation checklist

Use this checklist for issue #15 after a successful `Build Windows` workflow run.

## Artifact

1. Open the latest successful `Build Windows` workflow run on GitHub Actions.
2. Download the uploaded Windows build artifact.
3. Verify that the artifact contains:
   - top-level installer `.exe`
   - `CHECKSUMS.txt`
4. Optional: compare the installer SHA256 value against `CHECKSUMS.txt`.

Automated helper after download:

```powershell
npm run validate:windows -- --installer "C:\Path\To\Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe" --checksums "C:\Path\To\CHECKSUMS.txt"
```

This prints a validation report with platform, installer checksum, installed app path candidates and SQLite location. Add `-- --launch` to launch the installed app if it is found:

```powershell
npm run validate:windows -- --installer "C:\Path\To\Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe" --checksums "C:\Path\To\CHECKSUMS.txt" --launch
```

## Install and launch

1. Run the installer on Windows.
2. Start `Nyilaszaro Ajanlatkeszito` from the Start menu or installed shortcut.
3. Expected result:
   - app window opens
   - no blank white screen
   - no crash dialog
   - release mode starts without demo customers or demo quotes

## Release mode checks

The packaged app defaults to release mode.

Expected release state:

- no `Demo Partner Kft.`
- no `AJ-2026-0001`
- dashboard can create a new quote
- customer list can create and save a customer
- app restart keeps saved customer/quote data

Expected SQLite location:

```text
%APPDATA%\Nyilaszaro Ajanlatkeszito\app-state.sqlite
```

The exact folder can vary by Electron product name, but it must be under the user's app data folder, not inside the Git repository.

## Demo/dev mode checks

From the repository on Windows:

```powershell
npm install
npm run dev:demo
```

Expected demo state:

- `Demo Partner Kft.` is visible
- `AJ-2026-0001` is visible
- all bundled data is fictional

Release-mode development launch:

```powershell
npm run dev:release
```

Expected release-mode development state:

- no demo customer
- no demo quote
- app still renders the dashboard and settings screens

## Automated Electron smoke in CI

The `Build Windows` GitHub Actions workflow also starts the Electron app on the Windows runner before building the installer:

```powershell
npm run smoke:electron:release
npm run smoke:electron:demo
```

After `npm run build:win`, the workflow also starts the packaged unpacked executable:

```powershell
npm run smoke:packaged:release
```

The workflow then installs the generated NSIS setup into a temporary folder and starts the installed executable:

```powershell
npm run smoke:installer:release
```

It also runs a demo-mode installed-app PDF export smoke:

```powershell
npm run smoke:installer:pdf
```

It also runs an installed-app backup restart smoke:

```powershell
npm run smoke:installer:backup
```

The smoke run uses a temporary user data directory and prints a single JSON line prefixed with:

```text
NYILASZARO_ELECTRON_SMOKE_RESULT
```

Expected CI evidence:

- release mode renders the dashboard and empty quote state
- release mode does not render `Demo Partner Kft.`
- release mode does not render `AJ-2026-0001`
- demo mode renders `Demo Partner Kft.`
- demo mode renders `AJ-2026-0001`
- SQLite adapter is ready and exposes a database path
- packaged `dist/win-unpacked/Nyilaszaro Ajanlatkeszito.exe` starts in release mode and passes the same no-demo-data checks
- NSIS installer runs in silent mode into a temporary folder
- installed `Nyilaszaro Ajanlatkeszito.exe` starts in release mode and passes the same no-demo-data checks
- installed app starts in demo mode and writes customer/internal PDF files through Electron `printToPDF`
- installed app saves, exports and imports a fictional backup state, then a second launch verifies the imported customer/quote survived restart in SQLite

This automated smoke is a startup, data-mode, PDF file-generation and backup persistence check for development Electron, the unpacked packaged app and a silent-installed app. It does not replace the manual installed-app checks below, because it does not click through the installed shortcut, launch from Start menu, or visually inspect PDF layout.

## PDF checks

Use either a newly created quote or the demo quote in demo mode.

Customer PDF:

1. Click `Ügyfél PDF`.
2. Save the file.
3. Open the PDF.
4. Expected result:
   - net total, VAT and gross total are visible
   - purchase price, margin and coverage/fedezet are not visible

Internal PDF:

1. Click `Belső PDF`.
2. Save the file.
3. Open the PDF.
4. Expected result:
   - purchase total is visible
   - margin is visible
   - coverage/fedezet is visible
   - customer-facing totals are still visible

## Backup checks

1. Create a customer and quote.
2. Go to `Beállítások`.
3. Export JSON backup.
4. Restart the app.
5. Import the JSON backup.
6. Expected result:
   - customer and quote return
   - app restart after import keeps the restored data

## Helper report

The helper does not replace visual/manual checks. It verifies file-level evidence and can launch the installed app, then the person validating must still confirm the UI, PDF and backup behavior.

Copy the helper output into #15 together with the manual observations below.

## Result note template

Paste this into issue #15 or #2 after validation:

```text
Windows manual validation result:

- Workflow run:
- Installer artifact:
- validate:windows output:
- Windows version:
- Installed app launched: yes/no
- Release mode empty startup: yes/no
- Demo mode fictional data only: yes/no
- SQLite created under app data: yes/no
- Customer PDF saved/opened: yes/no
- Internal PDF saved/opened: yes/no
- Backup export/import: yes/no
- Notes:
```
