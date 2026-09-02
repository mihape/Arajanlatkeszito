(function attachCompleteQuoteModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NyilaszaroCompleteQuote = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCompleteQuoteModule() {
  const UNITS = Object.freeze(["db", "fm", "m²", "m³", "kg", "t", "óra", "nap", "hónap", "klt", "csomag", "átalány"]);

  const STARTER_CATEGORIES = Object.freeze([
    ["mobilization", "Felvonulási létesítmények és előkészítés"],
    ["earthworks", "Földmunkák és tereprendezés"],
    ["concrete", "Beton- és vasbeton munkák"],
    ["masonry", "Kőműves munkák"],
    ["scaffolding", "Zsaluzás és állványozás"],
    ["insulation", "Hőszigetelés"],
    ["stone-cladding", "Kőburkolás és térburkolat"],
    ["tiling", "Hideg- és melegburkolás"],
    ["drywall", "Szárazépítés és gipszkarton"],
    ["painting", "Festés és mázolás"],
    ["plumbing", "Víz- és csatornaszerelés"],
    ["openings", "Nyílászárók és árnyékolók"],
    ["incidental", "Egyéb járulékos munkák", "incidental"]
  ]);

  const INSULATION_TYPES = Object.freeze([
    { id: "eps_white", label: "Homlokzati EPS Fehér (EPS 80)", baseName: "fehér", defaultMaterialBase: 3400, materialPerCm: 480, defaultLaborBase: 7000, laborPerCm: 80 },
    { id: "eps_graphite", label: "Homlokzati EPS Grafitos (Grafit 80)", baseName: "GRAFITOS", defaultMaterialBase: 3600, materialPerCm: 640, defaultLaborBase: 7200, laborPerCm: 90 },
    { id: "xps", label: "Lábazati XPS zártcellás", baseName: "XPS", defaultMaterialBase: 3800, materialPerCm: 720, defaultLaborBase: 6800, laborPerCm: 80 },
    { id: "mineral_wool", label: "Homlokzati Kőzetgyapot", baseName: "kőzetgyapot", defaultMaterialBase: 4600, materialPerCm: 1100, defaultLaborBase: 8400, laborPerCm: 120 }
  ]);

  const INSULATION_THICKNESSES = Object.freeze([2, 4, 5, 6, 8, 10, 12, 14, 15, 16, 18, 20]);

  const DRYWALL_VARIANTS = Object.freeze([
    { id: "wall_rb_1x", label: "Válaszfal 1 rtg Normál (12.5 mm RB)", description: "Gipszkarton válaszfal készítése 75/100 mm CW/UW profilvázra, 2x1 réteg 12,5 mm normál RB gipszkarton burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 5800, laborUnitNet: 7500 },
    { id: "wall_rb_2x", label: "Válaszfal 2 rtg Normál (2x12.5 mm RB)", description: "Gipszkarton válaszfal készítése 75/100 mm CW/UW profilvázra, 2x2 réteg 12,5 mm normál RB burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 7200, laborUnitNet: 8800 },
    { id: "wall_rbi_impregnated", label: "Válaszfal Impregnált (zöld vizes helyiségbe)", description: "Gipszkarton válaszfal készítése CW/UW profilvázra, 2x1 réteg 12,5 mm impregnált RBI (zöld) gipszkarton burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 6800, laborUnitNet: 7900 },
    { id: "wall_rf_fire", label: "Válaszfal Tűzgátló (piros RF)", description: "Gipszkarton válaszfal készítése CW/UW profilvázra, 2x1 réteg 12,5 mm tűzgátló RF (piros) gipszkarton burkolattal, tűzvédelmi hézagolással", unit: "m²", materialUnitNet: 6900, laborUnitNet: 7900 },
    { id: "ceiling_cd_ud", label: "Mennyezet 1 rtg Normál CD/UD függesztve", description: "Beltéri mennyezetburkolat készítése CD/UD profilvázzal, függesztve, 1 réteg 12,5 mm gipszkarton lapburkolattal, Q2 minőségben", unit: "m²", materialUnitNet: 4900, laborUnitNet: 6800 },
    { id: "ceiling_rbi_impregnated", label: "Mennyezet Impregnált (zöld)", description: "Beltéri mennyezetburkolat készítése CD/UD profilvázzal, függesztve, 1 réteg 12,5 mm impregnált RBI gipszkartonnal, Q2 minőségben", unit: "m²", materialUnitNet: 5600, laborUnitNet: 7200 }
  ]);

  const PAINTING_VARIANTS = Object.freeze([
    { id: "paint_white_2x", label: "Festés 2 rtg fehér diszperziós", description: "Beltéri falfelület festése 2 rétegben fehér diszperziós falfestékkel, fedőréteggel", unit: "m²", materialUnitNet: 1400, laborUnitNet: 2200 },
    { id: "paint_color_2x", label: "Festés 2 rtg színes diszperziós", description: "Beltéri falfelület festése 2 rétegben színes diszperziós falfestékkel", unit: "m²", materialUnitNet: 1800, laborUnitNet: 2400 },
    { id: "paint_latex_2x", label: "Festés 2 rtg prémium mosható latex", description: "Beltéri falfelület festése 2 rétegben mosható, dörzsálló prémium latex falfestékkel", unit: "m²", materialUnitNet: 2400, laborUnitNet: 2800 },
    { id: "glett_q2", label: "Glettelés 2 rtg Q2 standard", description: "Falfelület előkészítése festéshez; glettelés 2 rétegben, Chromos GlettPro glettanyaggal, csiszolással (Q2 minőség)", unit: "m²", materialUnitNet: 1100, laborUnitNet: 2800 },
    { id: "glett_q3", label: "Glettelés 3 rtg Q3 emelt felület", description: "Falfelület előkészítése festéshez; glettelés 3 rétegben, finiseléssel és súrolófényes csiszolással (Q3 minőség)", unit: "m²", materialUnitNet: 1600, laborUnitNet: 3800 },
    { id: "glett_q4", label: "Glettelés Q4 prémium telibe húzás", description: "Falfelület komplett telibe glettelése és tükörsima finiselése prémium minőségben (Q4 minőség)", unit: "m²", materialUnitNet: 2200, laborUnitNet: 4900 }
  ]);

  const TILING_VARIANTS = Object.freeze([
    { id: "tile_floor_standard", label: "Aljzatburkolat standard (30x30 / 30x60)", description: "Aljzatburkolat készítése beltérben kiegyenlített aljzatra, ragasztással és fugázással (Peakston Superflex S1, Keracolor FF)", unit: "m²", materialUnitNet: 4500, laborUnitNet: 15500 },
    { id: "tile_floor_large", label: "Aljzatburkolat nagyméretű (60x60 / 60x120)", description: "Aljzatburkolat készítése nagyméretű (60x60 / 60x120 cm) lappal, flexibilis S1 ragasztóval, szintező ékkel, fugázással", unit: "m²", materialUnitNet: 5500, laborUnitNet: 18500 },
    { id: "tile_wall_standard", label: "Falburkolat standard méretben", description: "Falburkolat készítése beltérben ragasztással és fugázással (Mapei Keraflex Extra S1, Keracolor FF)", unit: "m²", materialUnitNet: 4800, laborUnitNet: 15500 },
    { id: "tile_wall_large", label: "Falburkolat nagyméretű (60x120)", description: "Falburkolat készítése nagyméretű (60x120 cm) lappal, szintezőrendszerrel és flexibilis ragasztással", unit: "m²", materialUnitNet: 5800, laborUnitNet: 18500 },
    { id: "leveling_3mm", label: "Önterülő aljzatkiegyenlítés 3 mm", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 3 mm átlagos vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 2400, laborUnitNet: 2200 },
    { id: "leveling_5mm", label: "Önterülő aljzatkiegyenlítés 5 mm", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 5 mm átlagos vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 3200, laborUnitNet: 2500 },
    { id: "leveling_10mm", label: "Önterülő aljzatkiegyenlítés 10 mm", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 10 mm átlagos vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 5800, laborUnitNet: 3200 }
  ]);

  function calculateAnchorLength(thicknessCm) {
    const cm = toNumber(thicknessCm, 10);
    const requiredMm = cm * 10 + 75;
    const standardSizes = [90, 110, 120, 140, 160, 180, 200, 220, 230, 240, 260, 280, 300, 320];
    const matched = standardSizes.find((size) => size >= requiredMm);
    return matched || Math.round(requiredMm / 10) * 10;
  }

  function getInsulationVariantDescription(typeId = "eps_white", thicknessCm = 10) {
    const cm = toNumber(thicknessCm, 10);
    const anchorMm = calculateAnchorLength(cm);
    if (typeId === "eps_graphite") {
      return `Homlokzati hőszigetelés, üvegszövetháló-erősített komplett hőszigetelő rendszerrel, (ragasztó, hőszigetelés, simitóhabarcs, háló, alapozó, védőbevonat), mechanikai rögzítéssel, kiegészítő profilok külön tételben szerepelnek, egyenes él-képzésű, homlokzati EPS ${cm} CM GRAFITOS hőszigetelő lapokkal, cementbázisú ragasztóporból képzett ragasztóba, tagolt sík, függőleges falon ${cm} cm hőszig. vastagság (ragasztótapasz+EPS80 ${cm} cm GRAFITOS+${anchorMm}mm dűbel+ 145gr dryvit háló+Chromos alapozó+Chromos Akril Pro 1,5mm vakolat)`;
    }
    if (typeId === "xps") {
      return `Lábazati hőszigetelés, ${cm} cm XPS polisztirol lappal, mechanikai rögzítéssel, ragasztva, hálózva, műgyantás gyöngyös vakolattal (ragasztótapasz+XPS ${cm}cm+${anchorMm}mm dűbel+145gr dryvit háló+műgyantás gyöngyös vakolat)`;
    }
    if (typeId === "mineral_wool") {
      return `Homlokzati hőszigetelés homlokzati kőzetgyapottal, komplett rendszerrel, (Klebespachtel ragasztó, kőzetgyapot szigetelés ${cm} cm, simítóhabarcs, háló, ${anchorMm}mm fémszeges dűbel, alapozó, szilikon vakolat)`;
    }
    return `Homlokzati hőszigetelés, üvegszövetháló-erősített komplett hőszigetelő rendszerrel, (ragasztó, hőszigetelés, simitóhabarcs, háló, alapozó, védőbevonat), mechanikai rögzítéssel, kiegészítő profilok külön tételben szerepelnek, egyenes él-képzésű, homlokzati EPS ${cm} CM fehér hőszigetelő lapokkal, cementbázisú ragasztóporból képzett ragasztóba, tagolt sík, függőleges falon ${cm} cm hőszig. vastagság (Klebespachtel ragasztótapasz+EPS80 ${cm} cm fehér+${anchorMm}mm dűbel+ 145gr dryvit háló+Chromos alapozó+Chromos Akril Pro 1,5mm vakolat)`;
  }

  function getInsulationVariantPrices(typeId = "eps_white", thicknessCm = 10) {
    const type = INSULATION_TYPES.find((item) => item.id === typeId) || INSULATION_TYPES[0];
    const cm = toNumber(thicknessCm, 10);
    const material = Math.round(type.defaultMaterialBase + cm * type.materialPerCm);
    const labor = Math.round(type.defaultLaborBase + cm * type.laborPerCm);
    return { materialUnitNet: material, laborUnitNet: labor };
  }

  const STARTER_TEMPLATES = Object.freeze([
    // Mobilizáció & előkészítés
    ["mobilization", "Munkaterület felvonulási és előkészítési költsége, konténer és felvonulási épület telepítése", "klt", 15000, 45000, true],
    ["mobilization", "Sitt és építési törmelék konténerbe termelése, elszállítása lerakóhelyi díjjal", "klt", 35000, 45000, true],

    // Földmunkák
    ["earthworks", "Humuszos termőréteg leszedése és helyszíni rendezése gépi és kézi erővel", "m³", 0, 5500, true],
    ["earthworks", "Alapárok kiemelése kézi vagy gépi erővel, dúcmentes munkaárokban", "m³", 0, 8500, false],

    // Beton- és vasbeton munkák
    ["concrete", "Estrich aljzatbeton készítése zsákos vagy helyszíni keveréssel, 5-7 cm vastagságban", "m²", 3500, 4500, true],
    ["concrete", "Vasbeton sáv-, talp- vagy lemezalap készítése transzportbetonból C20/25 minőségben", "m³", 38000, 18000, true],
    ["concrete", "Betonacél helyszíni szerelése, hálós vagy bordás vasalás elhelyezése", "kg", 520, 350, false],

    // Kőműves munkák
    ["masonry", "Válaszfal építése Ytong vagy tégla falazóelemből 10-15 cm vastagságban, falazóhabarccsal", "m²", 6500, 7500, true],
    ["masonry", "Főfalazat építése 30-as vázkerámia vagy pórusbeton blokkból", "m²", 12500, 9500, false],
    ["masonry", "Épített zuhany válaszfal kialakítása Ytong falazattal", "db", 8000, 25000, false],

    // Állványozás
    ["scaffolding", "Homlokzati csőállvány állítása állványcsőből mint munkaállvány, szintenkénti pallóterítéssel, korláttal, lábdeszkával, bontással", "m²", 0, 3200, true],
    ["scaffolding", "Mobil állvány állítása és bérlése", "klt", 0, 45000, false],

    // Hőszigetelés
    ["insulation", getInsulationVariantDescription("eps_white", 10), "m²", 8200, 7800, true],
    ["insulation", getInsulationVariantDescription("xps", 5), "m²", 7400, 7200, true],
    ["insulation", "Lábazati indítósín felhelyezése alumínium profilból, 10 cm szélességben", "fm", 1800, 1500, true],
    ["insulation", "Élvédő profil elhelyezése műanyag hálós élvédővel, pozitív sarkokhoz", "fm", 450, 850, true],
    ["insulation", "Hálós vízorros élvédő felhelyezése nyílászárók és áthidalók felett", "fm", 750, 950, true],
    ["insulation", "Nyílászáró spaletták kialakítása, kávák hőszigetelése, hálózva, glettelve, 1,5mm-es Chromos Akril Pro vakolattal", "fm", 2200, 3800, true],
    ["insulation", "Párkányok felrakása, alumínium vagy műanyag párkány elhelyezése 30 cm mélységig", "fm", 1500, 3200, true],
    ["insulation", "Ragalja szigetelése 2 cm XPS táblákkal, hálózva, színezve", "m²", 4800, 5500, false],
    ["insulation", "Tárcsás szigetelésrögzítő dűbelezés pótlólagos vagy sűrített elhelyezése", "db", 95, 120, false],

    // Kőburkolás és térburkolat
    ["stone-cladding", "Térburkolathoz fagyálló, teherhordó alap készítése 20-25 cm zúzottkő ágyazattal", "m²", 4500, 3800, true],
    ["stone-cladding", "Térburkolat készítése 6 cm vastag szürke vagy színes beton térkőből, homokágyba rakva, besöpréssel", "m²", 5200, 6500, true],

    // Hideg- és melegburkolás
    ["tiling", "Meglévő hidegburkolat és hozzá tartozó aljzat bontása, törmelék feltermelése platóra", "m²", 0, 5150, true],
    ["tiling", "Alapozás Superbond vagy Mapei mélyalapozóval", "m²", 450, 600, true],
    ["tiling", "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 5 mm vastagságban (Mapei Ultraplan Renovation)", "m²", 3200, 2500, true],
    ["tiling", "Felület kenhető vízszigetelése Mapei Mapegum WPS anyaggal, két rétegben, feszültségmentesítő hálóval", "m²", 3800, 2800, true],
    ["tiling", "Hajlaterősítő szalag felhelyezése sarkokhoz (Mapeband PE120)", "fm", 850, 900, true],
    ["tiling", "Aljzatburkolat készítése beltérben kiegyenlített aljzatra, ragasztással és fugázással (Peakston Superflex S1, Keracolor FF)", "m²", 4500, 15500, true],
    ["tiling", "Falburkolat készítése beltérben ragasztással és fugázással (Mapei Keraflex Extra S1, Keracolor FF)", "m²", 4800, 15500, true],
    ["tiling", "Lábazat burkolat készítése élcsiszolással vagy gyári elemből", "fm", 1200, 3500, true],

    // Szárazépítés és gipszkarton
    ["drywall", "Gipszkarton válaszfal készítése 75/100 mm CW/UW profilvázra, 2x1 réteg 12,5 mm gipszkarton burkolattal, szigeteléssel, Q2 hézagolással", "m²", 5800, 7500, true],
    ["drywall", "Beltéri mennyezetburkolat készítése CD/UD profilvázzal, függesztve, 1 réteg 12,5 mm gipszkarton lapburkolattal, Q2 minőségben", "m²", 4900, 6800, true],

    // Festés és mázolás
    ["painting", "Falfelület előkészítése festéshez; glettelés 2 rétegben, Chromos GlettPro glettanyaggal, csiszolással", "m²", 1100, 2800, true],
    ["painting", "Beltéri falfelület festése 2 rétegben diszperziós festékkel, fedőréteggel", "m²", 1400, 2200, true],
    ["painting", "Komplett tisztasági festés felületjavítással", "m²", 900, 1800, false],

    // Vízszerelés
    ["plumbing", "Víz- és csatornakiállás kialakítása, falhoronymarással és csővezeték fektetéssel", "klt", 25000, 45000, true],
    ["plumbing", "Szaniterek (mosdó, WC tartály, csaptelepek) beépítése és bekötése", "klt", 15000, 35000, true],

    // Nyílászárók és árnyékolók
    ["openings", "Nyílászáró beépítése falnyílásba, rögzítőfülekkel és PUR-habos hézagtömítéssel", "db", 2500, 14500, true],
    ["openings", "Beltéri ajtó beszerelése utólag beépíthető tokkal", "db", 3000, 18000, false],

    // Egyéb járulékos munkák
    ["incidental", "Anyagmozgatási, rakodási és belső logisztikai költség", "klt", 0, 45000, true],
    ["incidental", "Munkaterület folyamatos és záró takarítása, átadási előkészítés", "klt", 5000, 30000, true]
  ]);

  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundForint(value) {
    return Math.round(toNumber(value));
  }

  function normalizeQuantity(value) {
    const quantity = toNumber(value);
    return Math.round(Math.max(0, quantity) * 1000) / 1000;
  }

  function normalizeUnitPrice(value) {
    return Math.max(0, roundForint(value));
  }

  function generateStandardInsulationVariants(kind = "facade") {
    if (kind === "plinth") {
      const thicknesses = [4, 5, 8, 10, 12, 15];
      return thicknesses.map((th) => {
        const prices = getInsulationVariantPrices("xps", th);
        return {
          id: `ins_xps_${th}`,
          label: `${th} cm XPS Lábazati (${calculateAnchorLength(th)}mm dűbel)`,
          description: getInsulationVariantDescription("xps", th),
          unit: "m²",
          materialUnitNet: prices.materialUnitNet,
          laborUnitNet: prices.laborUnitNet
        };
      });
    }
    const thicknesses = [5, 8, 10, 12, 14, 15, 16, 20];
    const list = [];
    thicknesses.forEach((th) => {
      const prices = getInsulationVariantPrices("eps_white", th);
      list.push({
        id: `ins_eps_w_${th}`,
        label: `${th} cm Fehér EPS (${calculateAnchorLength(th)}mm dűbel)`,
        description: getInsulationVariantDescription("eps_white", th),
        unit: "m²",
        materialUnitNet: prices.materialUnitNet,
        laborUnitNet: prices.laborUnitNet
      });
    });
    [10, 15, 20].forEach((th) => {
      const prices = getInsulationVariantPrices("eps_graphite", th);
      list.push({
        id: `ins_eps_g_${th}`,
        label: `${th} cm Grafitos EPS (${calculateAnchorLength(th)}mm dűbel)`,
        description: getInsulationVariantDescription("eps_graphite", th),
        unit: "m²",
        materialUnitNet: prices.materialUnitNet,
        laborUnitNet: prices.laborUnitNet
      });
    });
    return list;
  }

  function createStarterCatalog() {
    const categories = STARTER_CATEGORIES.map(([id, name, kind = "regular"], position) => ({
      id: `complete-category-${id}`,
      name,
      kind,
      position,
      active: true
    }));
    const categoryByKey = new Map(STARTER_CATEGORIES.map(([id], position) => [id, categories[position].id]));
    const itemTemplates = STARTER_TEMPLATES.map(([categoryKey, description, unit, materialNet = 0, laborNet = 0, isBundle = false], position) => {
      let variants = [];
      if (categoryKey === "insulation" && description.includes("Homlokzati hőszigetelés")) {
        variants = generateStandardInsulationVariants("facade");
      } else if (categoryKey === "insulation" && description.includes("Lábazati")) {
        variants = generateStandardInsulationVariants("plinth");
      } else if (categoryKey === "scaffolding" && description.includes("csőállvány")) {
        variants = [
          { id: "scaff_12m", label: "0 - 12.00 m magasságig", description: "Homlokzati csőállvány állítása állványcsőből mint munkaállvány, szintenkénti pallóterítéssel, korláttal, lábdeszkával, 0-12 m munkapadló magasság között", unit: "m²", materialUnitNet: 0, laborUnitNet: 2800 },
          { id: "scaff_24m", label: "12.01 - 24.00 m magasságig", description: "Homlokzati csőállvány állítása állványcsőből mint munkaállvány, szintenkénti pallóterítéssel, korláttal, lábdeszkával, kétlábas, 0,60-0,90 m padlószélességgel, munkapadló távolság 2,00 m, 2,00 kN/m² terhelhetőséggel, állványépítés MSZ és alkalmazástechnikai kézikönyv szerint, 12,01-24,00 m munkapadló magasság között", unit: "m²", materialUnitNet: 0, laborUnitNet: 3400 }
        ];
      } else if (categoryKey === "tiling" && description.includes("aljzatkiegyenlítés")) {
        variants = [
          { id: "lev_3mm", label: "3 mm vastagságban", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 3 mm vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 2400, laborUnitNet: 2200 },
          { id: "lev_5mm", label: "5 mm vastagságban", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 5 mm vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 3200, laborUnitNet: 2500 },
          { id: "lev_10mm", label: "10 mm vastagságban", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 10 mm vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 5800, laborUnitNet: 3200 },
          { id: "lev_15mm", label: "15 mm vastagságban", description: "Padlóburkolat felületelőkészítése beltérben, önterülő aljzatkiegyenlítés 15 mm vastagságban (Mapei Ultraplan Renovation)", unit: "m²", materialUnitNet: 8400, laborUnitNet: 3800 }
        ];
      } else if (categoryKey === "tiling" && description.includes("Aljzatburkolat")) {
        variants = [
          { id: "tile_std", label: "Standard méret (30x30 / 30x60)", description: "Aljzatburkolat készítése beltérben kiegyenlített aljzatra, ragasztással és fugázással (Peakston Superflex S1, Keracolor FF)", unit: "m²", materialUnitNet: 4500, laborUnitNet: 15500 },
          { id: "tile_large", label: "Nagyméretű lap (60x60 / 60x120)", description: "Aljzatburkolat készítése nagyméretű (60x60 / 60x120 cm) lappal, flexibilis S1 ragasztóval, szintező ékkel, fugázással", unit: "m²", materialUnitNet: 5500, laborUnitNet: 18500 }
        ];
      } else if (categoryKey === "drywall" && description.includes("válaszfal")) {
        variants = [
          { id: "dry_rb1", label: "1 rtg Normál (12.5 mm RB)", description: "Gipszkarton válaszfal készítése 75/100 mm CW/UW profilvázra, 2x1 réteg 12,5 mm normál RB gipszkarton burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 5800, laborUnitNet: 7500 },
          { id: "dry_rb2", label: "2 rtg Normál (2x12.5 mm RB)", description: "Gipszkarton válaszfal készítése 75/100 mm CW/UW profilvázra, 2x2 réteg 12,5 mm normál RB burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 7200, laborUnitNet: 8800 },
          { id: "dry_rbi", label: "Impregnált zöld (RBI vizes helyiségbe)", description: "Gipszkarton válaszfal készítése CW/UW profilvázra, 2x1 réteg 12,5 mm impregnált RBI (zöld) gipszkarton burkolattal, szigeteléssel, Q2 hézagolással", unit: "m²", materialUnitNet: 6800, laborUnitNet: 7900 }
        ];
      } else if (categoryKey === "painting" && description.includes("festése")) {
        variants = [
          { id: "p_white", label: "Fehér 2 rtg diszperziós", description: "Beltéri falfelület festése 2 rétegben fehér diszperziós festékkel, fedőréteggel", unit: "m²", materialUnitNet: 1400, laborUnitNet: 2200 },
          { id: "p_color", label: "Színes 2 rtg diszperziós", description: "Beltéri falfelület festése 2 rétegben színes diszperziós festékkel", unit: "m²", materialUnitNet: 1800, laborUnitNet: 2400 },
          { id: "p_latex", label: "Prémium mosható latex", description: "Beltéri falfelület festése 2 rétegben mosható, dörzsálló prémium latex falfestékkel", unit: "m²", materialUnitNet: 2400, laborUnitNet: 2800 }
        ];
      }
      return {
        id: `complete-template-${position + 1}`,
        categoryId: categoryByKey.get(categoryKey),
        name: description.split(",")[0].slice(0, 45).trim(),
        description,
        unit,
        materialUnitNet: normalizeUnitPrice(materialNet),
        laborUnitNet: normalizeUnitPrice(laborNet),
        isStarterBundle: Boolean(isBundle),
        variants,
        active: true
      };
    });
    return { categories, itemTemplates };
  }

  function normalizeCatalog(catalog = {}) {
    const starter = createStarterCatalog();
    const categories = Array.isArray(catalog.categories) && catalog.categories.length ? catalog.categories : starter.categories;
    const itemTemplates = Array.isArray(catalog.itemTemplates) && catalog.itemTemplates.length ? catalog.itemTemplates : starter.itemTemplates;
    return {
      categories: categories.map((category, position) => ({
        id: String(category.id || `complete-category-${position + 1}`),
        name: String(category.name || "Új munkanem").trim(),
        kind: category.kind === "incidental" ? "incidental" : "regular",
        position: Number.isFinite(Number(category.position)) ? Number(category.position) : position,
        active: category.active !== false
      })).sort((left, right) => left.position - right.position),
      itemTemplates: itemTemplates.map((template, position) => {
        let rawVariants = Array.isArray(template.variants) && template.variants.length > 0 ? template.variants : [];
        if (rawVariants.length === 0) {
          if (template.description?.includes("Homlokzati hőszigetelés")) {
            rawVariants = generateStandardInsulationVariants("facade");
          } else if (template.description?.includes("Lábazati hőszigetelés") || (template.description?.includes("XPS") && template.description?.includes("Lábazat"))) {
            rawVariants = generateStandardInsulationVariants("plinth");
          }
        }
        return {
          id: String(template.id || `complete-template-${position + 1}`),
          categoryId: String(template.categoryId || ""),
          name: String(template.name || template.shortName || template.description?.split(",")[0]?.slice(0, 45) || `Tétel ${position + 1}`).trim(),
          description: String(template.description || "").trim(),
          unit: String(template.unit || "db").trim(),
          materialUnitNet: normalizeUnitPrice(template.materialUnitNet),
          laborUnitNet: normalizeUnitPrice(template.laborUnitNet),
          isStarterBundle: Boolean(template.isStarterBundle),
          variants: rawVariants.map((v, vIdx) => ({
            id: String(v.id || `var-${vIdx + 1}`),
            label: String(v.label || `Variáns ${vIdx + 1}`).trim(),
            description: String(v.description || template.description || "").trim(),
            unit: String(v.unit || template.unit || "db").trim(),
            materialUnitNet: normalizeUnitPrice(v.materialUnitNet ?? template.materialUnitNet),
            laborUnitNet: normalizeUnitPrice(v.laborUnitNet ?? template.laborUnitNet)
          })),
          active: template.active !== false
        };
      })
    };
  }

  function getStarterBundleTemplates(categoryId, catalog = {}) {
    const normalized = normalizeCatalog(catalog);
    const starter = createStarterCatalog();
    const category = (normalized.categories || []).find((c) => c.id === categoryId) || starter.categories.find((c) => c.id === categoryId);
    const categoryName = (category?.name || "").toLowerCase().trim();

    // 1. Direct match by categoryId in normalized catalog with isStarterBundle
    let bundle = (normalized.itemTemplates || []).filter((t) => t.active && t.categoryId === categoryId && t.isStarterBundle);
    if (bundle.length > 0) return bundle;

    // 2. Any active items in normalized catalog for categoryId
    const directItems = (normalized.itemTemplates || []).filter((t) => t.active && t.categoryId === categoryId);
    if (directItems.length > 0) return directItems;

    // 3. Fallback match from starter catalog by categoryId or matching name
    let starterCat = starter.categories.find((c) => c.id === categoryId);
    if (!starterCat && categoryName) {
      starterCat = starter.categories.find((c) => {
        const starterName = c.name.toLowerCase();
        return starterName.includes(categoryName) || categoryName.includes(starterName.slice(0, 6));
      });
    }
    if (starterCat) {
      bundle = starter.itemTemplates.filter((t) => t.categoryId === starterCat.id && t.isStarterBundle);
      if (bundle.length > 0) return bundle;
      return starter.itemTemplates.filter((t) => t.categoryId === starterCat.id);
    }

    return [];
  }

  function createStarterBundleItems(categoryId, catalog = {}) {
    const bundleTemplates = getStarterBundleTemplates(categoryId, catalog);
    return bundleTemplates.map((template, index) => createItem({
      id: `complete-item-${Date.now().toString(36)}-${index + 1}-${Math.random().toString(36).slice(2, 6)}`,
      templateId: template.id,
      description: template.description,
      unit: template.unit,
      materialUnitNet: template.materialUnitNet,
      laborUnitNet: template.laborUnitNet,
      quantity: 1,
      position: index
    }));
  }

  function detectInsulationVariant(description = "") {
    const text = String(description).toLowerCase();
    if (!text.includes("hőszigetelés") && !text.includes("eps") && !text.includes("xps") && !text.includes("kőzetgyapot")) {
      return null;
    }
    let typeId = "eps_white";
    if (text.includes("grafit") || text.includes("grafitos")) {
      typeId = "eps_graphite";
    } else if (text.includes("xps") || text.includes("lábazat")) {
      typeId = "xps";
    } else if (text.includes("kőzetgyapot") || text.includes("gyapot")) {
      typeId = "mineral_wool";
    }

    // Try extracting thickness in cm
    const matchCm = text.match(/(\d{1,2})\s*cm/i);
    const thicknessCm = matchCm ? Number(matchCm[1]) : 10;
    return { typeId, thicknessCm };
  }

  function applyInsulationVariant(item = {}, typeId = "eps_white", thicknessCm = 10) {
    const description = getInsulationVariantDescription(typeId, thicknessCm);
    const prices = getInsulationVariantPrices(typeId, thicknessCm);
    return {
      ...item,
      description,
      unit: "m²",
      materialUnitNet: prices.materialUnitNet,
      laborUnitNet: prices.laborUnitNet
    };
  }

  function detectDrywallVariant(description = "") {
    const text = String(description).toLowerCase();
    if (!text.includes("gipszkarton") && !text.includes("mennyezetburkolat") && !text.includes("válaszfal")) return null;
    return DRYWALL_VARIANTS.find((v) => text.includes(v.description.toLowerCase().slice(0, 25)) || text.includes(v.label.toLowerCase())) || DRYWALL_VARIANTS[0];
  }

  function detectPaintingVariant(description = "") {
    const text = String(description).toLowerCase();
    if (!text.includes("festés") && !text.includes("glettelés") && !text.includes("glett")) return null;
    return PAINTING_VARIANTS.find((v) => text.includes(v.description.toLowerCase().slice(0, 25)) || text.includes(v.label.toLowerCase())) || PAINTING_VARIANTS[0];
  }

  function detectTilingVariant(description = "") {
    const text = String(description).toLowerCase();
    if (!text.includes("burkolat") && !text.includes("aljzatkiegyenlítés") && !text.includes("önterülő")) return null;
    return TILING_VARIANTS.find((v) => text.includes(v.description.toLowerCase().slice(0, 25)) || text.includes(v.label.toLowerCase())) || TILING_VARIANTS[0];
  }

  function applyItemVariant(item = {}, variant = {}) {
    return {
      ...item,
      description: variant.description || item.description,
      unit: variant.unit || item.unit,
      materialUnitNet: Number.isFinite(variant.materialUnitNet) ? variant.materialUnitNet : item.materialUnitNet,
      laborUnitNet: Number.isFinite(variant.laborUnitNet) ? variant.laborUnitNet : item.laborUnitNet
    };
  }

  function createItem(overrides = {}) {
    return {
      id: "",
      templateId: "",
      description: "",
      quantity: 1,
      unit: "db",
      materialUnitNet: 0,
      laborUnitNet: 0,
      position: 0,
      ...overrides
    };
  }

  function normalizeItem(item = {}, position = 0) {
    return {
      ...createItem(item),
      id: String(item.id || ""),
      templateId: String(item.templateId || ""),
      description: String(item.description || "").trim(),
      quantity: normalizeQuantity(item.quantity),
      unit: String(item.unit || "").trim(),
      materialUnitNet: normalizeUnitPrice(item.materialUnitNet),
      laborUnitNet: normalizeUnitPrice(item.laborUnitNet),
      position: Number.isFinite(Number(item.position)) ? Number(item.position) : position
    };
  }

  function normalizeSection(section = {}, position = 0) {
    return {
      id: String(section.id || ""),
      categoryId: String(section.categoryId || ""),
      name: String(section.name || "Új munkanem").trim(),
      note: String(section.note || "").trim(),
      kind: section.kind === "incidental" ? "incidental" : "regular",
      position: Number.isFinite(Number(section.position)) ? Number(section.position) : position,
      items: (section.items || []).map((item, itemPosition) => normalizeItem(item, itemPosition)).sort((left, right) => left.position - right.position)
    };
  }

  function normalizeQuote(quote = {}) {
    return {
      id: String(quote.id || ""),
      number: String(quote.number || ""),
      customerId: String(quote.customerId || ""),
      projectAddress: String(quote.projectAddress || ""),
      workDescription: String(quote.workDescription || ""),
      createdAt: String(quote.createdAt || ""),
      updatedAt: String(quote.updatedAt || quote.createdAt || ""),
      validityDays: Math.max(1, Math.round(toNumber(quote.validityDays, 15))),
      vat: quote.vat === "FAD" ? "FAD" : toNumber(quote.vat, 27),
      status: String(quote.status || "Vázlat"),
      note: String(quote.note || ""),
      version: Math.max(1, Math.round(toNumber(quote.version, 1))),
      statusHistory: Array.isArray(quote.statusHistory) ? quote.statusHistory : [],
      sections: (quote.sections || []).map((section, position) => normalizeSection(section, position)).sort((left, right) => left.position - right.position)
    };
  }

  function calculateItem(item) {
    const normalized = normalizeItem(item);
    return {
      material: roundForint(normalized.quantity * normalized.materialUnitNet),
      labor: roundForint(normalized.quantity * normalized.laborUnitNet)
    };
  }

  function summarizeSection(section) {
    return (section?.items || []).reduce((totals, item) => {
      const calculated = calculateItem(item);
      totals.material += calculated.material;
      totals.labor += calculated.labor;
      return totals;
    }, { material: 0, labor: 0, net: 0 });
  }

  function vatRate(vat) {
    return vat === "FAD" ? 0 : toNumber(vat);
  }

  function summarizeQuote(quote) {
    const sections = (quote?.sections || []).map((section) => ({ ...section, totals: summarizeSection(section) }));
    const totals = sections.reduce((acc, section) => {
      acc.material += section.totals.material;
      acc.labor += section.totals.labor;
      if (section.kind === "incidental") {
        acc.incidentalMaterial += section.totals.material;
        acc.incidentalLabor += section.totals.labor;
      }
      return acc;
    }, { material: 0, labor: 0, incidentalMaterial: 0, incidentalLabor: 0 });
    totals.net = totals.material + totals.labor;
    totals.vatAmount = roundForint(totals.net * vatRate(quote?.vat) / 100);
    totals.gross = totals.net + totals.vatAmount;
    return { ...totals, sections };
  }

  function nextNumber(quotes = [], year = new Date().getFullYear()) {
    const prefix = `TZG-${year}-`;
    const highest = (quotes || []).reduce((max, quote) => {
      const number = String(quote?.number || "");
      if (!number.startsWith(prefix)) return max;
      const sequence = Number(number.slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
    }, 0);
    return `${prefix}${String(highest + 1).padStart(4, "0")}`;
  }

  function validateQuote(quote) {
    const errors = [];
    const warnings = [];
    if (!quote?.customerId) errors.push("Válassz ügyfelet az ajánlathoz.");
    if (!String(quote?.projectAddress || "").trim()) errors.push("Add meg a munkavégzés címét.");
    if (!String(quote?.workDescription || "").trim()) errors.push("Add meg a munka leírását.");
    (quote?.sections || []).forEach((section) => {
      if (!section.items?.length) warnings.push(`${section.name}: nincs tétel.`);
      (section.items || []).forEach((item, index) => {
        const label = `${section.name}, ${index + 1}. tétel`;
        if (!item.description?.trim()) errors.push(`${label}: hiányzik a tételszöveg.`);
        if (!item.unit?.trim()) errors.push(`${label}: hiányzik a mértékegység.`);
        if (!(normalizeQuantity(item.quantity) > 0)) errors.push(`${label}: a mennyiség legyen pozitív.`);
        if (normalizeUnitPrice(item.materialUnitNet) === 0 && normalizeUnitPrice(item.laborUnitNet) === 0) warnings.push(`${label}: nincs beárazva.`);
      });
    });
    return { errors, warnings, ready: errors.length === 0 };
  }

  return {
    UNITS,
    STARTER_CATEGORIES,
    INSULATION_TYPES,
    INSULATION_THICKNESSES,
    DRYWALL_VARIANTS,
    PAINTING_VARIANTS,
    TILING_VARIANTS,
    calculateAnchorLength,
    getInsulationVariantDescription,
    getInsulationVariantPrices,
    generateStandardInsulationVariants,
    detectInsulationVariant,
    applyInsulationVariant,
    detectDrywallVariant,
    detectPaintingVariant,
    detectTilingVariant,
    applyItemVariant,
    getStarterBundleTemplates,
    createStarterBundleItems,
    createStarterCatalog,
    normalizeCatalog,
    createItem,
    normalizeItem,
    normalizeSection,
    normalizeQuote,
    calculateItem,
    summarizeSection,
    summarizeQuote,
    nextNumber,
    validateQuote,
    vatRate
  };
});
