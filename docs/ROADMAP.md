# Fejlesztesi roadmap

## 0. fazis - Prototipus lezarasa es dokumentalas

Cel: a jelenlegi mukodo allapot biztonsagosan visszakeresheto legyen.

- Elso audit dokumentacio.
- README frissites.
- `.gitignore` letrehozasa.
- Electron projektvaz elokeszitese.
- GitHub issue es PR sablonok letrehozasa.
- Deployment, security es CRM handoff dokumentacio.
- Windows build workflow draft.
- Elso Git commit.
- GitHub repo letrehozasa.
- Kezdeti issue-k es milestone-ok.

## 1. fazis - Electron alap

Cel: a jelenlegi app Windows asztali alkalmazaskent induljon.

- `package.json` letrehozasa.
- Electron main/preload/renderer mappak kialakitasa.
- Jelenlegi `index.html`, `styles.css`, `app.js` atemelese renderer ala.
- Dev inditas es Windows build script.
- Minimalis telepitheto build.
- Release/demo mod validalasa.

Elfogadasi feltetel:

- Az app Windows alatt kulon ablakkent indul.
- A jelenlegi funkciok legalabb prototipus szinten mukodnek.

## 2. fazis - SQLite adatbazis

Cel: a `localStorage` kivaltasa tartos helyi adatbazissal.

- SQLite sema.
- Migracio a mostani JSON strukturabol.
- Backup/export tovabbra is mukodjon.
- Kepek fajlkent vagy kulon blob tarolassal kezelve.
- Alap adatbazis verziozas es migracio.

Elfogadasi feltetel:

- Az ajanlatok, ugyfelek, katalogusok es matrixok SQLite-ban tarolodnak.
- App ujrainditas utan minden adat megmarad.
- JSON backupbol visszaallithato az adat.

## 3. fazis - Kalkulacio es PDF stabilizalas

Cel: a legfontosabb arszamitasok tesztelhetok es nem csusznak el.

- Kalkulacios logika kiszervezese `shared/calculations.js` modulba.
- Tesztesetek matrix kerekitesre, nem gyarthato cellara, AFA-ra, haszonkulcsra.
- Belteri ajto egyedi tok felar teszt.
- Stabil Electron PDF export.
- Ugyfel PDF es belso PDF szetvalasztasa.

Elfogadasi feltetel:

- Automata tesztek futnak a kalkulacio kritikus reszeire.
- PDF export nem a kezi bongeszo nyomtatasra epul.

## 4. fazis - Torzsadat es arlista import

Cel: gyartoi arak gyorsabb felvitele.

- Matrix import sablon CSV/Excel iranybol.
- Hibajelzes hianyzo vagy rossz cellakra.
- Gyarto/profil/nyitastipus szerinti arlista verzio.
- Belteri ajto modell import.
- Redony/szunyoghalo/beepites import.

Elfogadasi feltetel:

- Egy gyarto alap arlistaja kezi cellazgatas nelkul betoltheto.
- Import utan ellenorizheto, mely cellak lettek nem gyarthatonak jelolve.

## 5. fazis - Munkahelyi workflow

Cel: tobb kollega is atlathatoan tudja hasznalni.

- Dashboard szurok.
- Ajanlat verziozas.
- Felmeresi lap.
- Megrendelesi/gyartoi osszesito.
- Statusz tortenet.
- Automatikus backup emlekezteto.

Elfogadasi feltetel:

- Egy ajanlat teljes utja kovetheto a vazlattol elfogadasig.
- A belso es ugyfelnek kuldott dokumentumok kulon valaszthatok.

## 6. fazis - CRM integracio

Cel: kesobbi CRM-kapcsolat ugy, hogy az app helyben tovabbra is hasznalhato maradjon.

- CRM adapter interfesz.
- Szinkron naplo.
- Kulso azonosito mezok.
- Ugyfel es ajanlat export/import.
- Hibakezeles sikertelen szinkronnal.

Elfogadasi feltetel:

- CRM nelkul is mukodik az app.
- CRM-mel osszekotve kovetheto, mi kerult at es mi hibazott.

## Megjegyzett hasznos kovetkezo otletek

- Helyiseg es pozicio tetelenkent.
- Ajanlaton beluli szekciok: nyilaszarok, redonyok, szunyoghalok, beepites.
- Ugyfel PDF reszletes vagy roviditett nezetben.
- Belso fedezet kimutatas beszerzesi ar, haszon es netto/brutto bontasban.
- Gyartonkenti megrendelesi lista.
- Kiszallitasi/beepitesi hatarido kulon a gyartasi hataridotol.
- Egyedi kedvezmeny vagy soron kivuli felar tetelenkent.
- Arlista ervenyessegi datum es regi arlista archiv.
