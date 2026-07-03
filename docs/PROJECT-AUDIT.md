# Projekt audit - Nyilaszaro Ajanlatkeszito

Datum: 2026-07-03

## Vizsgalt forrasok

- `README.md`
- `index.html`
- `app.js`
- `styles.css`
- Git munkafa allapota

Megjegyzes: a projekt celja kulon termek/repo, nem HR modul. A cel helyi Windows app, publikus repohoz biztonsagos demo adatokkal, installer/release folyamattal es kesobbi CRM adapter hatarokkal.

## Jelenlegi allapot

A projekt jelenleg egy offline, bongeszoben futtathato prototipus. A teljes uzleti logika, felulet es helyi adattarolas az `app.js` fajlban van, az adatok `localStorage` alatt tarolodnak.

Fajlok:

- `index.html`: minimalis belepesi pont
- `styles.css`: teljes feluleti stilus
- `app.js`: adatmodell, UI rendereles, kalkulacio, PDF nyomtatas, import/export
- `README.md`: rovid inditasi es funkcio leiras

Git:

- A mappa Git repo.
- A jelenlegi projektfajlok elso commitra elokeszitve.
- GitHub repo letrehozva: `mihape/Arajanlatkeszito`.
- Issue sablon, PR sablon es Windows build workflow elokeszites bekerult.
- Helyi WSL builden a Windows unpacked csomagolasig eljutottunk; az NSIS installer `wine` hiany miatt WSL alatt nem futott vegig.
- A `build:win:dir` WSL alatt letrehozta a Windows `.exe` artifactot, de 300 masodpercen belul nem lepett ki.

## Lefedett uzleti funkciok

- Ugyfeladatbazis alapadatokkal.
- Ajanlat dashboard statuszokkal, datumokkal, osszegekkel es gyors muveletekkel.
- Ajanlat szerkeszto haszonkulccsal, AFA valasztassal es gyartasi hataridovel.
- Muanyag nyilaszarok gyartokkal, profilokkal, UF/UG adatokkal.
- Kulon nyitastipusok: fix, buko, BNY, KFNY, ketszarnyu KFNY, tokosztott, erkelyajto, bejarati ajto.
- Profil + nyitastipus szerinti kulon armatrix.
- 100 mm-es raszteres matrix, cellankenti "nem gyarthato" jelolessel.
- Szinfelarak kulon kategoria szerint: kivul szines es kivul-belul szines.
- Uvegezes, toktoldo, redony, szunyoghalo es beepitesi tetelek.
- Belteri ajto torzsadat egyedi es standard gyartokhoz.
- Belteri modell ar Dekor/CPL bontasban, szin, tokvastagsag, kilincs, zar.
- Egyedi tok cm alapu felar szamitas.
- Belteri ajto modell-szin kepfeltoltes.
- PDF/nyomtatasi nezet tetelenkenti netto arral es netto/AFA/brutto osszesitessel.
- Teljes JSON mentes es visszatoltes.
- Elso Electron main/preload vaz.
- Release/demo mod irany: fejlesztesben demo, csomagolt appban ures release indulas.

## Atadasi doksi szerinti kovetelmenyek

- Kulon termek es kulon repository.
- Helyi, Windowsos Electron app.
- Publikus repohoz nincs realis ceges/ugyfel/szallitoi adat.
- README angol elso resszel es magyar osszefoglaloval.
- `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, CRM integracios terv.
- `CHANGELOG.md`, `RELEASE_NOTES.md`.
- GitHub Actions Windows build workflow.
- Release es demo build modok.
- Kesobbi CRM integracio adapter hatarokon keresztul.

## Fo technikai kockazatok

- `localStorage` nem eleg eros eles hasznalatra: serulekenyebb, nehezebb menteni, nincs rendes sema es migracio.
- A teljes app egy nagy `app.js` fajlban van, ami gyors prototipushoz jo, de hosszu tavon nehezen karbantarthato.
- A feltoltott kepek base64-kent kerulnek az adatbazisba, ami nagyobb adatmennyisegnel lassithatja a mentest es betoltest.
- A PDF jelenleg bongeszo nyomtatasra epul. Ez mukodik prototipuskent, de Windows appban stabilabb, verziozhato PDF generalas kell.
- Nincs automata teszt, igy a kalkulacios kepletek es PDF valtozasok konnyen elcsuszhatnak.
- Nincs szerepkor, jogosultsag vagy belso/ugyfel nezet szetvalasztas.
- A CRM-integracios hatar meg dokumentalt, de kodban nincs adapterre bontva.
- Nincs szinkron naplo es nincs kulso azonosito mezorendszer.

## Elektron/Windows irany ertekeles

Az app jo alap Electronhoz, mert a felulet es uzleti folyamat mar egy helyben lathato. Nem erdemes nullarol ujrakezdeni. A kovetkezo lepes inkabb az legyen, hogy a prototipust rendezetten atemeljuk egy Electron projektbe, majd a tarolast SQLite-ra csereljuk.

Javasolt sorrend:

1. Elso commit es GitHub push.
2. Electron projektvaz validalasa telepitett fuggesztesekkel.
3. SQLite adatmodell es migracio a mostani JSON/localStorage strukturarol.
4. Kalkulacios logika kiszervezese tesztelheto modulokba.
5. Stabil PDF export Electronbol.
6. CRM-integracios adapter kesobb, amikor a belso adatmodell mar stabil.

## Hianyok a kovetkezo fejleszteshez

- Nincs rogzitett adatbazis sema.
- Nincs arszamitas-specifikacio tesztesetekkel.
- Nincs felhasznaloi jogosultsagi koncepcio.
- Nincs dontes, hogy egy gepes helyi adatbazis vagy kesobbi tobbgepes, kozos adatbazis legyen az elsodleges cel.
- GitHub milestone-ok meg nincsenek letrehozva.
- Demo installer kulon mod meg nincs megvalositva.
- Teljes NSIS installer buildet GitHub Actions Windows runneren kell validalni.

## Hasznos kovetkezo funkcio otletek

- Helyiseg/pozicio mezo tetelenkent, peldaul "Nappali 1", "Halo bal".
- Felmeresi lap export a kivitelezo/kollega reszere.
- Megrendelesi vagy gyartoi osszesito PDF, amely nem ugyfelbarat ajanlat, hanem belso beszerzesi lista.
- Ajanlat verziozas, hogy latszodjon, mi valtozott egy modositas utan.
- Belso PDF beszerzesi arral es haszonnal, ugyfel PDF csak netto/AFA/brutto adatokkal.
- Dashboard szurok: statusz, ugyfel, datum, hatarido, elfogadott ajanlatok.
- Automatikus backup emlekezteto es visszaallitasi pontok.
- Arlista import sablon gyartonkent.
- CRM szinkron elokeszitese kulso azonosito mezokkel.
