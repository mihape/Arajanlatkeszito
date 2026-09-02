# Projektátadás – Nyílászáró árajánlat készítő

Frissítve: 2026-09-02

## Rövid helyzetkép

Ez egy Electron-alapú, Windowsra csomagolható asztali alkalmazás. A korábbi
nyílászáró-ajánlatkészítő funkció változatlanul megmaradt, mellette elkészült
egy új **„Komplett ajánlat készítés”** modul. A fejlesztés jelenleg helyben,
nem commitolt és nem GitHubra feltöltött állapotban van.

- Helyi branch: `main`
- Utolsó commit: `6e31d32 Update latest RC link to rc6`
- Remote: `https://github.com/mihape/Arajanlatkeszito.git`
- Az alkalmazás verziója a `package.json` szerint: `0.2.0`

## Az új modul célja

Egyszerű, TERC-szerű kivitelezői ajánlatokat lehet gyorsan összeállítani a
meglévő ügyféltörzsből. A folyamat:

1. Ügyfél és projektadatok kiválasztása/kitöltése.
2. Munkanemek kiválasztása és sorrendezése.
3. Tételek gyors felvétele sablonból vagy egyedileg.
4. Összesítő és Classic/Modern PDF export.

A gyors tételfelvétel jelenlegi működése:

- válassz munkanemet;
- válassz sablont a listából – ez azonnal új sort tesz az ajánlatba;
- add meg közvetlenül a mennyiséget, anyag- és munkadíj-egységárat;
- Enterrel a fókusz mennyiség → anyagár → munkadíj → következő sablon mezőre
  lép;
- a részletes leírás és a sablonkezelés csak a `Részletek` alatt látszik.

Ez a flow a felhasználói visszajelzések alapján lett egyszerűsítve. Az egyedi
tétel továbbra is a `+ Egyedi tétel` gombbal vihető fel.

## Főbb elkészült funkciók

- Komplett ajánlatok saját dashboarddal, kereséssel és ügyfél/státusz/dátum
  szűréssel.
- Meglévő ügyféltörzsből kötelező ügyfélválasztás.
- Ajánlati azonosító: `TZG-ÉÉÉÉ-NNNN`; az adott év legnagyobb tárolt sorszámából
  képződik, adatbázis-szintű egyediséggel.
- 13 induló munkanem és általánosított, TERC-hangulatú mintatétel-katalógus.
- Sablonból és egyedileg felvitt tételek, átrendezés, másolás, szerkesztés,
  archiválás, új sablon mentése és törzssablon frissítése.
- Mértékegységek: `db`, `fm`, `m²`, `m³`, `kg`, `t`, `óra`, `nap`, `hónap`,
  `klt`, `csomag`, `átalány`, illetve egyedi beírás.
- Külön nettó anyag- és munkadíj-egységár, egész forintra kerekített sorösszeg.
- Munkanem-részösszegek, nettó, ÁFA és bruttó végösszeg. Támogatott ÁFA:
  `0%`, `5%`, `27%`, `FAD`.
- Figyelmeztetés üres munkanemre és teljesen nulla árú tételre; exportot blokkol
  a hiányzó szöveg, egység, munkacím/leírás vagy nem pozitív mennyiség.
- Classic és Modern A4 álló PDF ugyanabból a számításból:
  címoldal, munkanem-összesítő, majd munkanemenként tételtáblázat.
- PDF-táblázat javítva: a tételszöveg 48%-os, széles oszlopot kap; a számmezők
  keskenyek, több sorba törő fejlécet használnak.

## Fontos fájlok

| Terület | Fájlok |
| --- | --- |
| Funkcionális leírás | `docs/COMPLETE_QUOTE_MODULE.md` |
| Architektúra és ütemterv | `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` |
| Közös kalkuláció és alapadatok | `src/shared/complete-quote-calculations.js` |
| SQLite séma és tárolási csatornák | `src/shared/sqlite-schema.js`, `src/shared/storage-contract.js` |
| Adatbázis CRUD/migráció | `src/main/database.js` |
| Electron IPC | `src/main/main.js`, `src/preload/preload.js` |
| PDF fájlnév/export | `src/main/pdf-export.js` |
| UI és gyors tételfelvétel | `src/renderer/app.js`, `src/renderer/index.html`, `src/renderer/styles.css` |
| CRM capability-k | `src/shared/crm-contract.js` |
| Kalkuláció teszt | `tests/complete-quote-calculations.test.js` |
| Gyors UI-flow teszt | `tests/complete-quote-renderer-flow.test.js` |

## Adatmodell és kompatibilitás

- A SQLite séma v2-re bővült komplett ajánlatokkal, munkanem-pillanatképekkel,
  tételekkel, kategóriatörzzsel és tételsablonokkal.
- A tételsablon ajánlatba helyezése pillanatképet készít, ezért későbbi
  sablonmódosítás nem írja át a régi ajánlatokat.
- Használt kategória/sablon nem törölhető véglegesen, csak archiválható.
- Ügyfél nem törölhető, ha hagyományos vagy komplett ajánlat hivatkozik rá.
- A backup/import útvonal a komplett ajánlatok és a katalógus adatait is kezeli.
- A meglévő nyílászáró-ajánlat funkcióhoz nem nyúltunk üzleti logikailag.

## Futatás és ellenőrzés

```bash
npm install
npm run dev:demo
npm run dev:release
npm run check
npm run build:win
```

- `npm run check` az utolsó futtatáskor teljesen zöld volt.
- A statikus böngészős előnézet (`file:///.../src/renderer/index.html`) csak a
  felületet mutatja; nem helyettesíti az Electron IPC-t, az SQLite-ot vagy a
  valódi PDF-mentést.
- A Linux/WSL környezetben az Electron teljes smoke futtatása környezeti
  `UtilBindVsockAnyPort` hibába ütközött. Ezért még szükséges egy Windowsos
  kézi ellenőrzés és a Classic/Modern PDF-export kipróbálása.

## Referenciaanyag és adatvédelem

- A `mintaajanalat/` mappa referencia Excel/PDF anyagokat tartalmaz.
- A mappa `.gitignore` alatt van, ezért sem a fájlok, sem a bennük szereplő
  valós ügyféladatok és árak nem kerülhetnek commitba vagy release-be.
- Valódi TERC-adatbázis-integráció, Excel import/export, belső beszerzési
  ár/haszonkulcs, illetve tényleges CRM-szinkron nem része ennek a verziónak.

## Nyitott teendők a következő agentnek

1. Windows alatt indítsa el az Electron alkalmazást (`npm run dev:release`),
   készítsen egy valódi komplett ajánlatot meglévő ügyféllel, és exportálja
   Classic és Modern PDF-be.
2. Ellenőrizze a gyors tételfelvételt: sablonválasztás után azonnal keletkezik
   sor, az árak/mennyiség közvetlenül szerkeszthetők, Enter jól léptet.
3. Ellenőrizze sok és hosszú tétellel, hogy a PDF tételszöveg-oszlopa elég
   széles, a fejléc nem fed át más oszlopot, és a többoldalas táblázat fejléce
   ismétlődik.
4. Ha UI-visszajelzés alapján módosítás kell, a gyors összeállítást tartsa
   elsődlegesnek; a ritkább műveletek maradjanak a részletes nézetben.
5. Commit előtt ellenőrizze a `git status`-t, különösen hogy a
   `mintaajanalat/` nem jelenik meg benne. A jelenlegi módosítások még nincsenek
   commitolva vagy feltöltve.
6. GitHub művelet előtt ellenőrizze a `gh auth status`-t: korábban a `mihape`
   fiók tokenje érvénytelen volt. Emiatt GitHub issue, commit, tag és release
   nem készült ebben a körben.

## Jelenlegi Git-módosítások

Módosult a fő alkalmazás, a SQLite/IPC réteg, a renderer, a PDF export, a
dokumentáció, a csomagverzió és a kapcsolódó tesztek. Új, még nem követett
fájlok:

```text
docs/COMPLETE_QUOTE_MODULE.md
src/shared/complete-quote-calculations.js
tests/complete-quote-calculations.test.js
tests/complete-quote-renderer-flow.test.js
handover.md
```
