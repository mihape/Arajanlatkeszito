(function attachCompleteQuoteModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NyilaszaroCompleteQuote = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCompleteQuoteModule() {
  const UNITS = Object.freeze(["db", "fm", "m²", "m³", "kg", "t", "óra", "nap", "hónap", "klt", "csomag", "átalány"]);

  const STARTER_CATEGORIES = Object.freeze([
    ["mobilization", "Felvonulási létesítmények"],
    ["earthworks", "Földmunkák"],
    ["concrete", "Beton- és vasbeton munkák"],
    ["masonry", "Kőműves munkák"],
    ["scaffolding", "Zsaluzás és állványozás"],
    ["insulation", "Hőszigetelés"],
    ["stone-cladding", "Kőburkolás"],
    ["tiling", "Hideg- és melegburkolás"],
    ["drywall", "Szárazépítés"],
    ["painting", "Festés"],
    ["plumbing", "Vízszerelés"],
    ["openings", "Nyílászárók és árnyékolók"],
    ["incidental", "Egyéb járulékos munkák", "incidental"]
  ]);

  const STARTER_TEMPLATES = Object.freeze([
    ["mobilization", "Munkaterület felvonulási és előkészítési költsége", "klt"],
    ["earthworks", "Humuszos termőréteg leszedése és helyszíni rendezése", "m³"],
    ["concrete", "Vasbeton alaptest készítése helyszíni vagy transzportbeton technológiával", "m³"],
    ["masonry", "Válaszfal építése falazóelemből, falazóhabarccsal", "m²"],
    ["scaffolding", "Homlokzati csőállvány állítása és bontása, munkaállványként", "m²"],
    ["insulation", "Homlokzati hőszigetelés komplett rendszerrel, EPS 10 cm hőszigetelő lappal", "m²"],
    ["insulation", "Élvédő profil elhelyezése műanyag hálós élvédővel, pozitív sarkokhoz", "fm"],
    ["insulation", "Hálós vízorros élvédő felhelyezése", "fm"],
    ["insulation", "Lábazati indítósín felhelyezése", "fm"],
    ["stone-cladding", "Kőburkolat készítése előkészített alapfelületen", "m²"],
    ["tiling", "Aljzat alapozása mélyalapozóval, két rétegben", "m²"],
    ["tiling", "Hidegburkolat készítése kiegyenlített aljzatra ragasztással és fugázással", "m²"],
    ["drywall", "Gipszkarton válaszfal szerkezet készítése szigeteléssel", "m²"],
    ["painting", "Beltéri falfelület glettelése és festése", "m²"],
    ["plumbing", "Víz- és csatornakiállás kialakítása", "klt"],
    ["openings", "Nyílászáró beépítése és környező csatlakozások tömítése", "db"],
    ["incidental", "Anyagmozgatási költség", "klt"]
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

  function createStarterCatalog() {
    const categories = STARTER_CATEGORIES.map(([id, name, kind = "regular"], position) => ({
      id: `complete-category-${id}`,
      name,
      kind,
      position,
      active: true
    }));
    const categoryByKey = new Map(STARTER_CATEGORIES.map(([id], position) => [id, categories[position].id]));
    const itemTemplates = STARTER_TEMPLATES.map(([categoryKey, description, unit], position) => ({
      id: `complete-template-${position + 1}`,
      categoryId: categoryByKey.get(categoryKey),
      description,
      unit,
      materialUnitNet: 0,
      laborUnitNet: 0,
      active: true
    }));
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
      itemTemplates: itemTemplates.map((template, position) => ({
        id: String(template.id || `complete-template-${position + 1}`),
        categoryId: String(template.categoryId || ""),
        description: String(template.description || "").trim(),
        unit: String(template.unit || "db").trim(),
        materialUnitNet: normalizeUnitPrice(template.materialUnitNet),
        laborUnitNet: normalizeUnitPrice(template.laborUnitNet),
        active: template.active !== false
      }))
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
    createStarterCatalog,
    normalizeCatalog,
    createItem,
    normalizeItem,
    normalizeQuote,
    calculateItem,
    summarizeSection,
    summarizeQuote,
    nextNumber,
    validateQuote,
    vatRate
  };
});
