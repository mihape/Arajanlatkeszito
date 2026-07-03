# Security And Data Safety

## Scope

This is a local-first desktop app. The first production target is not a multi-user web system, so the main risks are local data leakage, accidental publication of business data, unsafe Electron defaults, and broken backup habits.

## Public Repository Rules

Never commit:

- real customer data
- real addresses or phone numbers
- real quote PDFs
- real supplier price lists
- real purchase prices
- local backups
- SQLite databases
- imported spreadsheets with business data
- `.env` files

The `.gitignore` excludes common local data and backup files, but the final check before any public push is still manual review.

## Demo Data Rules

Demo data must be clearly fictional.

Recommended:

- `Demo Partner Kft.`
- `1111 Budapest, Példa utca 1.`
- `example.invalid`

Avoid common-looking personal names, real domains, real addresses, and real supplier lists.

## Electron Baseline

Current baseline:

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- local file loading
- renderer Content Security Policy
- narrow preload API

## Local Storage Risk

The prototype still uses `localStorage`. This is acceptable only for the current prototype stage.

Before real business use:

- replace `localStorage` with SQLite
- add database versioning
- add backup/restore
- document where local data lives
- test restore on another machine

## CRM Integration Risk

CRM integration must be adapter-based. Do not hard-code CRM internals into quote calculation or UI components.

Future CRM mode must handle:

- tenant and office identifiers
- permission checks
- sync errors
- audit/activity history
- document upload failures
