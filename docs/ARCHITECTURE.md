# Celarchitektura - Windows/Electron app

## Cel

Egy helyi adatbazisos Windows alkalmazas, amely gyorsan hasznalhato ajanlatkeszitesre, biztonsagosan tarolja a torzsadatokat, kesobb pedig osszekotheto CRM rendszerrel.

## Javasolt technologia

- Electron: Windows desktop alkalmazas, telepitheto csomaggal.
- SQLite: helyi adatbazis arakhoz, ugyfelekhez, ajanlatokhoz es katalogushoz.
- HTML/CSS/JavaScript renderer: a mostani prototipus gyorsan atemelheto.
- Kesobbi modularizalas: a kalkulacio, adateleres es PDF export kulon modulokba keruljon.
- GitHub: verziozas, issue-k, milestone-ok, release-ek es Windows build artifactok.

## Alkalmazas retegzes

### Main process

- Electron ablak letrehozasa.
- SQLite kapcsolat kezelese.
- Fajlmuveletek: backup export/import, kepmentes, PDF export.
- Kesobbi frissites-ellenorzes es telepito logika.

### Preload API

- Biztonsagos hid a renderer es a main process kozott.
- Engedelyezett muveletek:
  - adat lekerdezese
  - adat mentese
  - backup export/import
  - PDF generalas
  - kep feltoltes es fajlba mentese

### Renderer

- Dashboard.
- Ajanlat szerkeszto.
- Ugyfelek.
- Muanyag nyilaszarok.
- Belteri ajtok.
- Armatrixok.
- Kiegeszitok.
- Beallitasok.

## Javasolt mappastruktura

```text
docs/
.github/
src/
  main/
    main.js
    database.js
    pdf.js
    backup.js
  preload/
    preload.js
  renderer/
    index.html
    app.js
    styles.css
  shared/
    pricing-calculations.js
    sqlite-schema.js
    storage-contract.js
    ids.js
scripts/
package.json
```

Aktualis allapot: az Electron `main`, `preload` es `renderer` retegek mar a `src/` mappaban vannak. Az elsodleges inditas `npm run dev`, a bongeszos ellenorzes pedig csak fallback a `src/renderer/index.html` utvonalon.

A SQLite elokeszites elso kodszintu elemei:

- `src/shared/sqlite-schema.js`: elso sema/migracio v1.
- `src/shared/storage-contract.js`: tabla- es szinkronmezok, elso IPC csatorna.
- `src/main/database.js`: ideiglenes adapterstatusz, kesobb a valodi SQLite kapcsolat helye.
- `window.nyilaszaroApp.data.getStatus()`: preload hatar bizonyitasara.

A kalkulacios logika elso tesztelheto modulja:

- `src/shared/pricing-calculations.js`
- `tests/pricing-calculations.test.js`

## Release es demo mod

A publikus repo es a release build nem tartalmazhat valos uzleti adatot. A jelenlegi irany:

- fejlesztoi Electron inditas: demo mod, fiktiv mintaadatokkal
- csomagolt Electron app: release mod, ures ugyfel/ajanlat indulassal
- kesobbi demo installer: kulon build mod, csak fiktiv adatokkal

## Javasolt SQLite adatmodell

- `settings`
- `customers`
- `quotes`
- `quote_items`
- `profiles`
- `exterior_opening_types`
- `price_matrices`
- `price_matrix_cells`
- `colors`
- `glasses`
- `extensions`
- `accessories`
- `interior_manufacturers`
- `interior_models`
- `interior_colors`
- `interior_frames`
- `interior_handles`
- `interior_locks`
- `item_images`
- `sync_queue`

## CRM-integracio elokeszitese

A CRM-et nem erdemes az elso Electron lepesben bekotni, de az adatmodellt mar ugy kell kialakitani, hogy kesobb ne kelljen atirni mindent.

Javasolt mezok:

- `external_id`: CRM-bol erkezo vagy oda kuldott azonosito.
- `updated_at`: utolso helyi modositas.
- `synced_at`: utolso sikeres CRM szinkron.
- `sync_status`: pending, synced, failed.

Javasolt szinkron esemenyek:

- ugyfel letrehozva/modositva
- ajanlat letrehozva/modositva
- ajanlat statusz valtozott
- PDF export elkeszult

## PDF export irany

Rovid tavon Electron `printToPDF` hasznalhato, mert kozel all a mostani nyomtatasi nezettel. Kesobb erdemes kulon PDF sablon reteg:

- ugyfel ajanlat
- belso ajanlat beszerzesi adatokkal
- felmeresi lap
- gyartoi/megrendelesi osszesito

## Biztonsagi alapelvek Electronban

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- aktualis stabil Electron verzio kovetese
- alap Content Security Policy a rendererben
- minden fajl- es adatbazis-muvelet preload API-n keresztul
- adatbazis a felhasznalo alkalmazas-adatmappajaban
- rendszeres backup export lehetoseg
- semmilyen erzekeny adat ne keruljon GitHubra vagy repo fajlba

Kiindulo Electron verzio: `43.0.0`.
