# Deployment

## Goal

The production direction is a Windows installer for a standalone Electron app. The app must be usable without CRM access and without an internet connection after installation.

## Local Development

```bash
npm install
npm run dev
```

Development mode uses fictional demo records so screenshots and manual testing are easier.

## Checks

```bash
npm run check
```

Current check scope:

- renderer syntax: `app.js`
- Electron main process syntax
- Electron preload syntax

## Windows Build

```bash
npm run build:win
```

Expected output:

- installer under `dist/`
- unpacked build artifacts under `dist/`

## Release Mode

Packaged builds should start in release mode. Release mode must not seed real or demo customers/quotes by default.

Current behavior:

- development Electron run: demo mode
- packaged Electron run: release mode
- browser fallback without query string: demo mode

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
- `Nyilaszaro-Ajanlatkeszito-Demo-Setup-<version>.exe`
- `CHECKSUMS.txt`

The demo installer is a later milestone. The current workflow prepares the normal Windows build path first.
