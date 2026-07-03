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
http://127.0.0.1:5173/index.html?mode=release
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
http://127.0.0.1:5173/index.html?mode=demo
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

- rerun `Build Windows` workflow on `main`
