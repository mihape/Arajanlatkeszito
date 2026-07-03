# Nyilaszaro Quote Builder

Local-first Windows quote builder for window, door, shutter, mosquito screen, installation, and interior-door offers. The project is being prepared as a standalone Electron app with local storage first, SQLite next, PDF/export workflows, and later CRM-ready adapter boundaries.

All bundled demo data is fictional and intended only for development, screenshots, and testing.

## Current Status

This repository currently contains:

- a working offline browser prototype
- an initial Electron `main`/`preload` shell
- quote dashboard and quote editor
- customer records
- exterior plastic window/door profiles and opening types
- price matrices with non-manufacturable cells
- interior door model pricing
- accessories, installation items, VAT, margin, and print-friendly quote output
- documentation for architecture, roadmap, GitHub workflow, and CRM direction

## Run The Prototype

Open `index.html` directly in a browser, or run a local server:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/index.html
```

## Electron Development

Install dependencies:

```bash
npm install
```

Start the Electron app in development mode:

```bash
npm run dev
```

Development mode starts with fictional demo data. A packaged app defaults to release mode and should start without demo customer/quote records unless demo mode is explicitly enabled.

Run checks:

```bash
npm run check
```

## Windows Build

```bash
npm run build:win
```

Build output is written to `dist/`.

## Hungarian Summary

Ez egy helyi Windows ajanlatkeszito app nyilaszarokhoz. A jelenlegi verzio meg prototipus, de mar elindult az Electron irany: kesobb SQLite adatbazissal, stabil PDF exporttal, GitHub release folyamattal es CRM-integracios adapterekkel kell tovabbvinni.

## Documentation

- [Original handoff](ARAJANLAT_KESZITO_HANDOFF.md)
- [Project audit](docs/PROJECT-AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [QA notes](docs/QA.md)
- [CRM handoff](docs/CRM_HANDOFF.md)
- [GitHub workflow](docs/GITHUB-WORKFLOW.md)
- [Development decisions](docs/DECISIONS.md)
