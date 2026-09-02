# Komplett ajánlat készítés

## Cél

Az alkalmazás a meglévő nyílászáró-ajánlatoktól külön kezelhető, TERC-szerűen részletezett építőipari ajánlatokat is készít. A két ajánlattípus közösen használja a helyi ügyféltörzset, cégadatokat, státuszokat és backupot, de saját számozást, tételkatalógust és PDF-et kap.

## Működési modell

1. Az ajánlat készítője kiválaszt egy meglévő ügyfelet, majd megadja a helyszínt, a munka leírását, a keltezést, az érvényességet, az ÁFA-kulcsot és a megjegyzést.
2. A címoldal és a munkanem-összesítő kötelező. A munkanemek külön választhatók, átrendezhetők és ajánlatonként pillanatképként tárolódnak.
3. Egy munkanemhez tételkatalógusból vagy egyedileg adható hozzá tétel. A tétel leírást, mennyiséget, mértékegységet, nettó anyag-egységárat és nettó munkadíj-egységárat tartalmaz.
4. A tételsablon később módosítható vagy archiválható, de a korábbi ajánlati sorokat nem változtathatja meg.

## Induló kategóriák

- Felvonulási létesítmények
- Földmunkák
- Beton- és vasbeton munkák
- Kőműves munkák
- Zsaluzás és állványozás
- Hőszigetelés
- Kőburkolás
- Hideg- és melegburkolás
- Szárazépítés
- Festés
- Vízszerelés
- Nyílászárók és árnyékolók
- Egyéb járulékos munkák

Az utolsó kategória az ajánlati címoldalon külön összesítő sor, de teljes értékben része a nettó és bruttó végösszegnek.

## Számítási szabályok

- A mennyiség pozitív, legfeljebb három tizedesjegyű szám.
- Az egységárak egész, nemnegatív forintértékek.
- Anyagösszeg: `round(mennyiség × anyag-egységár)`.
- Munkadíj: `round(mennyiség × munkadíj-egységár)`.
- A munkanem- és ajánlati összegek a már kerekített sorok összegei.
- Az ÁFA a nettó anyag- és munkadíj összegére kerül; a támogatott értékek `0`, `5`, `27` és `FAD`.
- Nulla anyag- vagy munkadíj megengedett. A mindkét oldalon nulla tétel és az üres munkanem export előtt figyelmeztetést ad, de nem akadályozza az exportot.

## PDF-ek

Mindkét stílus ugyanabból az ajánlati pillanatképből számol és azonos tartalmat jelenít meg:

1. Címoldal cég- és ügyféladatokkal, munka leírásával, érvényességgel, megjegyzéssel, főösszesítővel és aláíráshellyel.
2. Munkanem-összesítő külön anyag- és munkadíj oszlopokkal.
3. Minden kiválasztott munkanem külön oldalon tételtáblával és részösszeggel.

Az export előtti választás:

- **Classic:** kompakt, fekete-fehér táblázatos elrendezés.
- **Modern:** az alkalmazás arculatához illeszkedő, levegősebb elrendezés.

A tételtábla oszlopai: sorszám, tételszöveg, mennyiség, egység, anyag-egységár, munkadíj-egységár, anyagösszeg, munkadíj. A hosszú táblák ismétlődő fejléccel és ajánlatszámot tartalmazó oldalszámozott lábléccel készülnek.

## Adatkezelés és határok

- A komplett ajánlatok száma `TZG-ÉÉÉÉ-NNNN`; az adott év legnagyobb létező sorszámából képződik.
- A teljes ajánlat-, munkanem- és tételpillanatkép SQLite-ban és JSON backupban is megmarad.
- Kategóriát és sablont referencia esetén archiválni kell, nem törölni.
- A `mintaajanalat/` csak helyi referenciaanyag: nem része a Git-történetnek, a release-nek vagy az induló seednek. Az induló katalógus ebből kézzel általánosított, ár- és ügyfélmentes szövegeket tartalmaz.
- Excel-import/export, licencelt TERC-adatbázis, belső beszerzési költség és külön belső PDF nem része ennek a verziónak.
