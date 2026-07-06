# Windows validation checklist

Use this checklist for issue #15 after a successful `Build Windows` workflow run.

## Artifact

1. Open the latest successful `Build Windows` workflow run on GitHub Actions.
2. Download the uploaded Windows build artifact.
3. Verify that the artifact contains:
   - top-level installer `.exe`
   - `CHECKSUMS.txt`
4. Optional: compare the installer SHA256 value against `CHECKSUMS.txt`.

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

## Result note template

Paste this into issue #15 or #2 after validation:

```text
Windows manual validation result:

- Workflow run:
- Installer artifact:
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
