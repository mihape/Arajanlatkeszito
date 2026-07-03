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
- PDF layout should still be visually checked after Electron `printToPDF` is implemented

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
