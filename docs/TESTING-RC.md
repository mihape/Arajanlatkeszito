# RC testing guide

## Cel

Ez a dokumentum az elso kiprobalhato Windows release candidate ellenorzesi forgatokonyve.

Az RC celja nem egy demo adatokkal telepakolt program, hanem egy tiszta, helyi adatbazisos ajanlatkeszito, amit sajat gyartokkal, termekekkel, armatixokkal es kiegeszitokkel lehet feltolteni.

## Alapelvek

- Release modban az app ures adatbazissal indul.
- Valos gyartoi arak, ugyfeladatok, arlistak, PDF-ek es belso atadasi anyagok nem kerulhetnek a repoba vagy release-be.
- Legfeljebb 1-1 fiktiv pelda lehet elerheto tanulasi vagy smoke teszt celra.
- A kesobbi ugyfelprezentacios irany miatt az UI-nak ugyfelbarat, rendezett es vizualisan vallalhato alapot kell adnia.
- Ugyfelnezetben csak eladasi arak jelenhetnek meg; beszerzesi ar, haszon es fedezet csak belso nezetben latszodhat.

## Telepites es elso inditas

1. Nyisd meg a legfrissebb sikeres `Build Windows` GitHub Actions futast.
2. Toltsd le a Windows artifactot.
3. Ellenorizd, hogy az artifact tartalmazza:
   - `Nyilaszaro Ajanlatkeszito Setup 0.1.0.exe`
   - `CHECKSUMS.txt`
4. Futtasd az installert Windows alatt.
5. Inditsd el az appot Start menubol vagy desktop shortcutbol.

Elvart eredmeny:

- az app ablak megnyilik
- nincs ures feher kepernyo
- nincs crash dialog
- nincs `Demo Partner Kft.`
- nincs `AJ-2026-0001`
- az `Ajanlatok` dashboard ertheto ures allapotot mutat

## Elso feltoltesi sorrend

Az ures appban a javasolt feltoltesi sorrend:

1. `Muanyag nyilaszarok`: gyarto, profil, Uf, nyitastipusok.
2. `Armatixok`: profilhoz es nyitastipushoz tartozo matrix, nem gyarthato cellak jelolese.
3. `Kiegeszitok`: szinek, uvegek, toktoldok, redonyok, szunyoghalok, beepitesi tetelek.
4. `Belteri ajtok`: gyarto, modell, dekor/CPL ar, szin, tokvastagsag, kilincs, zar.
5. `Ugyfelek`: alap ugyfeladatok.
6. `Ajanlatok`: elso ajanlat letrehozasa, tetel hozzaadasa, PDF export.

## Minimalis RC tesztforgatokonyv

### 1. Ures release ellenorzes

- Inditsd az installalt appot.
- Ellenorizd, hogy nincs demo ugyfel es nincs demo ajanlat.
- Ellenorizd, hogy az ures dashboard nem hat hibas allapotnak.

### 2. Saját vagy fiktiv peldaadat felvitele

- Hozz letre egy fiktiv ugyfelet.
- Hozz letre egy gyartot/profilt vagy importalj egy kesobbi fiktiv mintat.
- Hozz letre legalabb egy nyitastipust es egy armatix sort/oszlopot.
- Hozz letre legalabb egy szin/uveg/kiegeszito vagy beepitesi tetelt.

### 3. Ajanlat letrehozasa

- Hozz letre uj ajanlatot.
- Allits be AFA-t.
- Adj hozza legalabb egy nyilaszaros tetelt.
- Adj hozza egy kiegeszito vagy beepitesi tetelt, ha van feltoltott adat.
- Ellenorizd a netto, AFA es brutto osszesitot.

### 4. PDF export

Ugyfel PDF:

- csak eladasi arakat mutat
- netto, AFA es brutto osszesito latszik
- beszerzesi ar, haszon es fedezet nem latszik

Belso PDF:

- beszerzesi ar latszik
- haszon/fedezet latszik
- netto, AFA es brutto osszesito tovabbra is ellenorizheto

### 5. Ujrainditas es backup

- Zard be az appot.
- Inditsd ujra.
- Ellenorizd, hogy a felvitt adatok megmaradtak.
- Exportalj JSON backupot.
- Importald vissza a backupot.
- Inditsd ujra meg egyszer, es ellenorizd az adatmegmaradast.

## Prezentacios irany elokeszitese

Az RC-ben meg nem teljes ugyfelprezentacios uzemmod keszul, de a felulet es PDF irany mar ezt keszitse elo:

- a szerkesztoi/belso nezet valassza szet a beszerzesi es ugyfel arakat
- a kesobbi prezentacios nezet csak ugyfel arakat mutasson
- a nyilaszaros tetelekhez legyen hely szerkezeti rajz vagy feltoltott tipus kep szamara
- a PDF ne csak belso kalkulacios tablazatnak hasson, hanem ugyfelnek kuldheto dokumentumnak

## GitHub issue kapcsolatok

- Epic: #10
- Windows kezi validacio: #15
- Publikus repo safety gate: #1
- RC/UX subissue-k: #18, #20, #21, #19 a #10 Phase 6 alatt.
