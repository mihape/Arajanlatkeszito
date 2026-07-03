# Release Notes

## 0.1.0 - Draft

This is the first repository baseline for the Nyilaszaro Quote Builder.

Included:

- offline quote-builder prototype
- dashboard and quote editor
- exterior window/door price matrices
- interior door pricing
- accessories and installation cost handling
- print-friendly quote output
- initial Electron app shell
- GitHub-ready documentation and templates

Known limitations:

- data still uses browser `localStorage`
- Electron dependencies must be installed with `npm install`
- no SQLite database yet
- PDF export still uses print layout
- CRM adapters are documented but not implemented
- local WSL installer builds need `wine`; use `npm run build:win:dir` for WSL package validation
