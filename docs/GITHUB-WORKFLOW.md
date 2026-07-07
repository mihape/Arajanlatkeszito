# GitHub munkafolyamat

## Repo celja

A GitHub repo legyen a teljes projekt hivatalos kovetesi pontja:

- forraskod
- visszamenoleges dokumentacio
- fejlesztesi dontesek
- hibak es igenyek
- Windows release-ek
- kesobbi CRM integracios feladatok

## Branch javaslat

- `main`: stabil, bemutathato allapot.
- `feature/*`: uj fejlesztesek.
- `fix/*`: javitasok.
- `docs/*`: dokumentacios munka.

Az elso helyi branch most `master`. GitHub letrehozas elott erdemes atnevezni `main`-re.

## Kezdeti milestone-ok

1. `v0.1 - Prototipus archivalas`
   - jelenlegi app commitolasa
   - audit, architektura, roadmap
   - GitHub repo es issue sablonok

2. `v0.2 - Electron alap`
   - Windows appkent induljon
   - fejlesztoi inditas
   - build script

3. `v0.3 - SQLite adatbazis`
   - localStorage kivaltasa
   - adatbazis sema
   - backup/migracio

4. `v0.4 - Stabil PDF es kalkulacio`
   - ugyfel PDF
   - belso PDF
   - kalkulacios tesztek

5. `v0.5 - Munkahelyi workflow`
   - ajanlat verziozas
   - felmeresi lap
   - gyartoi/megrendelesi osszesito

6. `v1.0 - Eles hasznalat`
   - telepitheto Windows build
   - dokumentalt backup
   - validalt arszamitas

## Issue cimkek

- `feature`: uj funkcio
- `bug`: hibajavitas
- `docs`: dokumentacio
- `electron`: Windows app keret
- `database`: SQLite es adatmodell
- `pdf`: export es sablon
- `pricing`: arszamitas
- `crm`: kesobbi integracio
- `ops`: build, release, backup

## Elso javasolt issue-k

1. Electron fejlesztoi inditas validalasa Windows alatt.
2. SQLite sema megtervezese a jelenlegi JSON allapotbol.
3. Kalkulacios logika kiszervezese tesztelheto modulba.
4. Ugyfel PDF es belso PDF szetvalasztasa.
5. Arlista import sablon megtervezese.
6. CRM adapter mezok elokeszitese.

## Pull request szabaly

Minden PR tartalmazza:

- mit valtoztat
- hogyan lett ellenorizve
- erint-e arszamitast vagy PDF-et
- van-e adatbazis/migracio hatasa

## Windows build workflow kapuk

A `Build Windows` workflow sorrendje:

- `npm ci`
- `npm run check`
- `npm run smoke:electron:release`
- `npm run smoke:electron:demo`
- `npm run build:win`
- `npm run smoke:packaged:release`
- `npm run smoke:installer:release`
- `CHECKSUMS.txt` generalas
- artifact feltoltes
- tag eseten release asset feltoltes

Az Electron smoke a fejlesztoi Electron inditast, release/demo adatmodot es SQLite adapter indulast bizonyitja Windows runneren. A packaged smoke a `dist/win-unpacked` csomagolt exe release indulasat bizonyitja. Az installer smoke az NSIS setup csendes telepiteset es az installalt exe release indulasat bizonyitja. A shortcutos inditas, PDF vizualis ellenorzes es backup visszatoltes tovabbra is kulon release kapu.

## Elso publikus push elotti lista

- Ellenorizni kell, hogy minden mintaadat fiktiv.
- Futtatni kell: `npm run check`.
- Nem lehet staged allapotban `.db`, `.sqlite`, backup JSON, importalt arlista vagy exportalt PDF.
- Belso munkafajl nem kerulhet a publikus repoba.
- A repo lathatosagat es nevet a tulajdonossal egyeztetni kell.
