# Nyilaszaro Quote Builder

Local-first Windows quote builder for window, door, shutter, mosquito screen, installation, and interior-door offers. The project is being prepared as a standalone Electron app with a durable local SQLite store, PDF/export workflows, and later CRM-ready adapter boundaries.

Packaged release builds are intended to start with an empty local database so the owner can upload their own manufacturers, products, price matrices, colors, glazing, accessories, interior doors and installation items. Any bundled sample data must be fictional and limited to development, screenshots, smoke tests or an explicitly imported example.

## Current Status

This repository currently contains:

- a working Electron app shell
- an offline browser preview fallback
- quote dashboard and quote editor
- customer records
- exterior plastic window/door profiles and opening types
- price matrices with non-manufacturable cells
- catalog setup overviews for profiles, matrices, accessories, installation items, and interior doors
- interior door model pricing
- accessories, installation items, VAT, margin, and print-friendly quote output
- tested shared pricing calculations for matrix rounding, VAT, margin, accessories, and custom interior frames
- initial Electron preload SQLite bridge with durable app-state storage and normalized table mirroring
- documentation for architecture, roadmap, GitHub workflow, and CRM direction
- RC testing guidance for empty release startup, first data setup and PDF checks

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

Explicit launch modes:

```bash
npm run dev:demo
npm run dev:release
```

Run checks:

```bash
npm run check
```

## Browser Preview Fallback

Electron is the primary development path. If you only need a quick rendered preview, run a local server:

```bash
python3 -m http.server 5173
```

Then open:

```text
http://127.0.0.1:5173/src/renderer/index.html?mode=demo
```

## Windows Build

```bash
npm run build:win
```

Build output is written to `dist/`.

## Release Candidate Testing

Use the RC guide when validating a Windows build:

- [RC testing guide](docs/TESTING-RC.md)

The expected first-run release experience is an empty, usable app with clear setup direction, not a pre-filled demo system.

## Hungarian Summary

Ez egy helyi Windows ajanlatkeszito app nyilaszarokhoz. A jelenlegi verzio mar Electron szerkezetben fut, es kesobb SQLite adatbazissal, stabil PDF exporttal, GitHub release folyamattal es CRM-integracios adapterekkel kell tovabbvinni.

## Documentation

- [Project audit](docs/PROJECT-AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [RC testing guide](docs/TESTING-RC.md)
- [Windows validation checklist](docs/WINDOWS_VALIDATION.md)
- [Security](docs/SECURITY.md)
- [QA notes](docs/QA.md)
- [CRM integration](docs/CRM_INTEGRATION.md)
- [SQLite migration](docs/SQLITE_MIGRATION.md)
- [GitHub workflow](docs/GITHUB-WORKFLOW.md)
- [Development decisions](docs/DECISIONS.md)
