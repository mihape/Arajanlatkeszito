const DB_KEY = "nyilaszaro-ajanlatkeszito-v1";
const APP_MODE = getAppMode();
const pricing = window.NyilaszaroPricing;

if (!pricing) {
  throw new Error("Pricing module is not loaded.");
}

const productTypes = [
  { id: "window", name: "Ablak", multiplier: 1 },
  { id: "balcony", name: "Erkélyajtó", multiplier: 1.22 },
  { id: "entrance-door", name: "Kültéri ajtó", multiplier: 1.6 },
  { id: "interior-door", name: "Beltéri ajtó", multiplier: 1 }
];

const matrixProductTypes = productTypes.filter((type) => type.id !== "interior-door");

const interiorFinishOptions = [
  { id: "decor", name: "Dekor ajtó", priceField: "decorPrice" },
  { id: "cpl", name: "CPL ajtó", priceField: "cplPrice" }
];

const openingTypes = [
  { id: "fixed", name: "Fix ablak", productTypeId: "window", note: "" },
  { id: "tilt", name: "Bukó ablak", productTypeId: "window", note: "" },
  { id: "turn", name: "BNY ablak", productTypeId: "window", note: "Balos vagy jobbos nyíló ablak." },
  { id: "tilt-turn", name: "KFNY ablak", productTypeId: "window", note: "Bukó-nyíló ablak." },
  { id: "double-tilt-turn", name: "Kétszárnyú KFNY ablak", productTypeId: "window", note: "" },
  { id: "divided", name: "Tokosztott ablak", productTypeId: "window", note: "" },
  { id: "balcony", name: "Erkélyajtó", productTypeId: "balcony", note: "" },
  { id: "entrance-door", name: "Bejárati ajtó", productTypeId: "entrance-door", note: "" },
  { id: "door", name: "Ajtó", productTypeId: "interior-door", note: "" }
];

const navItems = [
  { id: "quotes", label: "Ajánlatok", icon: "file" },
  { id: "customers", label: "Ügyfelek", icon: "users" },
  { id: "profiles", label: "Műanyag nyílászárók", icon: "factory" },
  { id: "interior", label: "Beltéri ajtók", icon: "door" },
  { id: "matrices", label: "Ármátrixok", icon: "grid" },
  { id: "extras", label: "Kiegészítők", icon: "layers" },
  { id: "settings", label: "Beállítások", icon: "settings" }
];

const app = document.getElementById("app");
let state = loadState();
let desktopSaveTimer = null;
let ui = {
  view: "quotes",
  selectedQuoteId: state.quotes[0]?.id || "",
  selectedItemId: "",
  selectedCustomerId: state.customers[0]?.id || "",
  selectedProfileId: state.catalog.profiles[0]?.id || "",
  selectedMatrixProfileId: state.catalog.profiles[0]?.id || "",
  selectedMatrixProductType: "tilt-turn",
  selectedOpeningImageId: "tilt-turn",
  selectedInteriorManufacturerId: state.catalog.interiorDoors?.manufacturers?.[0]?.id || "",
  selectedInteriorModelId: state.catalog.interiorDoors?.models?.[0]?.id || "",
  selectedInteriorImageColorId: state.catalog.interiorDoors?.colors?.[0]?.id || "",
  quoteStatusFilter: "all",
  quoteCustomerFilter: "all",
  quoteCreatedFrom: "",
  quoteDeadlineFilter: "",
  quoteSearch: "",
  itemDraft: createDefaultItem(state),
  customerDraft: createCustomerDraft(),
  profileDraft: createProfileDraft(),
  interiorManufacturerDraft: createInteriorManufacturerDraft(state.catalog.interiorDoors?.manufacturers?.[0]),
  interiorModelDraft: createInteriorModelDraft(state.catalog.interiorDoors?.models?.[0]),
  toast: "",
  printMode: "customer"
};

render();
hydrateStateFromDesktopStorage();

document.addEventListener("click", handleClick);
document.addEventListener("input", handleInput);
document.addEventListener("change", handleChange);
window.addEventListener("afterprint", clearPrintMode);

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function money(value) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(Number(value || 0));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function showToast(message) {
  ui.toast = message;
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    ui.toast = "";
    render();
  }, 2600);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function getAppMode() {
  try {
    const mode = new URLSearchParams(window.location.search).get("mode");
    return mode === "release" ? "release" : "demo";
  } catch (error) {
    return "demo";
  }
}

function loadState() {
  const seed = createSeedState();
  try {
    const stored = localStorage.getItem(DB_KEY);
    if (!stored) return seed;
    return normalizeState(JSON.parse(stored), seed);
  } catch (error) {
    console.warn("Nem sikerült betölteni a helyi adatbázist.", error);
    return seed;
  }
}

function normalizeState(raw, seed) {
  const merged = {
    ...seed,
    ...raw,
    settings: { ...seed.settings, ...(raw.settings || {}) },
    catalog: {
      ...seed.catalog,
      ...(raw.catalog || {}),
      profiles: raw.catalog?.profiles?.length ? raw.catalog.profiles : seed.catalog.profiles,
      matrices: { ...seed.catalog.matrices, ...(raw.catalog?.matrices || {}) },
      colors: normalizeColors(raw.catalog?.colors?.length ? raw.catalog.colors : seed.catalog.colors),
      glasses: raw.catalog?.glasses?.length ? raw.catalog.glasses : seed.catalog.glasses,
      extensions: raw.catalog?.extensions?.length ? raw.catalog.extensions : seed.catalog.extensions,
      accessories: raw.catalog?.accessories?.length ? raw.catalog.accessories : seed.catalog.accessories,
      interiorDoors: normalizeInteriorDoors(raw.catalog?.interiorDoors, seed.catalog.interiorDoors),
      exteriorOpenings: normalizeExteriorOpenings(raw.catalog?.exteriorOpenings, seed.catalog.exteriorOpenings)
    },
    openingImages: raw.openingImages || {}
  };
  Object.values(merged.catalog.matrices).forEach((matrix) => {
    matrix.blocked = matrix.blocked || {};
  });
  const migratedMatrices = {};
  merged.catalog.profiles.forEach((profile) => {
    merged.catalog.exteriorOpenings.forEach((opening) => {
      const newKey = matrixKey(profile.id, opening.id);
      const legacyKey = matrixKey(profile.id, opening.productTypeId);
      migratedMatrices[newKey] = merged.catalog.matrices[newKey] || merged.catalog.matrices[legacyKey] || createMatrix(profile, matrixTypeForOpening(opening));
      migratedMatrices[newKey].blocked = migratedMatrices[newKey].blocked || {};
    });
  });
  merged.catalog.matrices = { ...merged.catalog.matrices, ...migratedMatrices };
  if (!merged.customers?.length) merged.customers = seed.customers;
  merged.quotes = (merged.quotes || seed.quotes).map((quote) => normalizeQuoteWorkflow(quote, seed));
  if (!merged.quotes?.length) merged.quotes = seed.quotes;
  return merged;
}

function normalizeQuoteWorkflow(quote, seed) {
  const createdAt = quote.createdAt || new Date().toISOString().slice(0, 10);
  const status = quote.status || "Vázlat";
  return {
    ...quote,
    status,
    createdAt,
    updatedAt: quote.updatedAt || createdAt,
    version: Number(quote.version || 1),
    statusHistory: Array.isArray(quote.statusHistory) && quote.statusHistory.length
      ? quote.statusHistory
      : [{ status, at: createdAt, note: "Kezdő állapot" }],
    productionDeadline: quote.productionDeadline || seed.settings.defaultProductionDeadline || "6-8 hét"
  };
}

function normalizeColors(colors) {
  return colors.map((color) => ({
    ...color,
    type: color.type || "percent",
    outsideValue: Number(color.outsideValue ?? color.value ?? 0),
    bothValue: Number(color.bothValue ?? color.value ?? 0)
  }));
}

function normalizeExteriorOpenings(raw = [], seed = openingTypes) {
  const source = raw?.length ? raw : seed;
  return source.map((opening) => ({
    id: opening.id || uid("opening"),
    name: opening.name || "Új nyitástípus",
    productTypeId: opening.productTypeId || (opening.id === "balcony" ? "balcony" : opening.id === "entrance-door" ? "entrance-door" : "window"),
    note: opening.note || ""
  }));
}

function normalizeInteriorDoors(raw = {}, seed) {
  return {
    ...seed,
    ...raw,
    manufacturers: raw?.manufacturers?.length ? raw.manufacturers : seed.manufacturers,
    models: raw?.models?.length ? raw.models.map((model) => ({
      ...model,
      customFrameEnabled: Boolean(model.customFrameEnabled),
      decorIncludedFrameCm: Number(model.decorIncludedFrameCm ?? 12),
      cplIncludedFrameCm: Number(model.cplIncludedFrameCm ?? 15),
      customFrameSurchargePerCm: Number(model.customFrameSurchargePerCm ?? 0),
      images: model.images || {}
    })) : seed.models,
    colors: raw?.colors?.length ? raw.colors : seed.colors,
    frames: raw?.frames?.length ? raw.frames : seed.frames,
    handles: raw?.handles?.length ? raw.handles : seed.handles,
    locks: raw?.locks?.length ? raw.locks : seed.locks
  };
}

function saveState() {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
  scheduleDesktopSave();
}

async function hydrateStateFromDesktopStorage() {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.loadState) return;
  try {
    const result = await dataApi.loadState();
    if (!result?.state) {
      scheduleDesktopSave();
      return;
    }
    state = normalizeState(result.state, createSeedState());
    resetUiAfterStateHydration();
    render();
  } catch (error) {
    console.warn("Nem sikerült betölteni a SQLite adatbázist.", error);
  }
}

function resetUiAfterStateHydration() {
  ui.selectedQuoteId = state.quotes[0]?.id || "";
  ui.selectedItemId = "";
  ui.selectedCustomerId = state.customers[0]?.id || "";
  ui.selectedProfileId = state.catalog.profiles[0]?.id || "";
  ui.selectedMatrixProfileId = state.catalog.profiles[0]?.id || "";
  ui.selectedMatrixProductType = state.catalog.exteriorOpenings?.[0]?.id || "tilt-turn";
  ui.selectedOpeningImageId = state.catalog.exteriorOpenings?.[0]?.id || "tilt-turn";
  ui.selectedInteriorManufacturerId = state.catalog.interiorDoors?.manufacturers?.[0]?.id || "";
  ui.selectedInteriorModelId = state.catalog.interiorDoors?.models?.[0]?.id || "";
  ui.selectedInteriorImageColorId = state.catalog.interiorDoors?.colors?.[0]?.id || "";
  ui.itemDraft = createDefaultItem(state);
  ui.customerDraft = createCustomerDraft();
  ui.profileDraft = createProfileDraft();
  ui.interiorManufacturerDraft = createInteriorManufacturerDraft(state.catalog.interiorDoors?.manufacturers?.[0]);
  ui.interiorModelDraft = createInteriorModelDraft(state.catalog.interiorDoors?.models?.[0]);
}

function scheduleDesktopSave() {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.saveState) return;
  window.clearTimeout(desktopSaveTimer);
  desktopSaveTimer = window.setTimeout(() => {
    dataApi.saveState(clone(state)).catch((error) => {
      console.warn("Nem sikerült menteni a SQLite adatbázist.", error);
    });
  }, 250);
}

async function saveStateToDesktopNow() {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.saveState) return null;
  window.clearTimeout(desktopSaveTimer);
  return dataApi.saveState(clone(state));
}

function syncStateFromMutation(result, options = {}) {
  if (!result?.state) return false;
  const previous = {
    view: ui.view,
    selectedQuoteId: ui.selectedQuoteId,
    selectedItemId: ui.selectedItemId,
    selectedCustomerId: ui.selectedCustomerId
  };
  state = normalizeState(result.state, createSeedState());
  resetUiAfterStateHydration();
  ui.view = options.view || previous.view;
  ui.selectedQuoteId = options.selectedQuoteId ?? (state.quotes.some((quote) => quote.id === previous.selectedQuoteId) ? previous.selectedQuoteId : state.quotes[0]?.id || "");
  ui.selectedItemId = options.selectedItemId ?? previous.selectedItemId;
  ui.selectedCustomerId = options.selectedCustomerId ?? (state.customers.some((customer) => customer.id === previous.selectedCustomerId) ? previous.selectedCustomerId : state.customers[0]?.id || "");
  return true;
}

async function persistCustomer(customer) {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.upsertCustomer) {
    saveState();
    return { ok: true };
  }
  const result = await dataApi.upsertCustomer(clone(customer));
  syncStateFromMutation(result, { selectedCustomerId: customer.id, view: ui.view });
  return result;
}

async function persistCustomerDelete(id) {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.deleteCustomer) {
    saveState();
    return { ok: true };
  }
  const result = await dataApi.deleteCustomer(id);
  if (result.ok) syncStateFromMutation(result);
  return result;
}

async function persistQuote(quote) {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.upsertQuote) {
    saveState();
    return { ok: true };
  }
  const result = await dataApi.upsertQuote(clone(quote));
  syncStateFromMutation(result, { selectedQuoteId: quote.id, selectedItemId: ui.selectedItemId, view: ui.view });
  return result;
}

async function persistQuoteDelete(id) {
  const dataApi = window.nyilaszaroApp?.data;
  if (!dataApi?.deleteQuote) {
    saveState();
    return { ok: true };
  }
  const result = await dataApi.deleteQuote(id);
  if (result.ok) syncStateFromMutation(result);
  return result;
}

function createSeedState() {
  const profiles = [
    {
      id: "profile-aluplast-ideal4000",
      manufacturer: "Aluplast",
      name: "Ideal 4000",
      category: "Kültéri műanyag",
      uf: 1.2,
      ug2: 1,
      ug3: 0.6,
      note: "Alap minta profil, szabadon átírható."
    },
    {
      id: "profile-gealan-s9000",
      manufacturer: "Gealan",
      name: "S 9000",
      category: "Kültéri műanyag",
      uf: 0.92,
      ug2: 1,
      ug3: 0.5,
      note: "Prémium minta profil, háromrétegű üvegezéshez."
    }
  ];

  const matrices = {};
  profiles.forEach((profile, profileIndex) => {
    openingTypes.filter((opening) => opening.productTypeId !== "interior-door").forEach((opening) => {
      matrices[matrixKey(profile.id, opening.id)] = createMatrix(profile, matrixTypeForOpening(opening), profileIndex);
    });
  });

  const demoMode = APP_MODE === "demo";
  const createdAt = todayIso();
  const customers = demoMode ? [
    {
      id: "customer-demo-partner",
      name: "Demo Partner Kft.",
      phone: "+36 30 000 0001",
      email: "demo.partner@example.invalid",
      address: "1111 Budapest, Példa utca 1.",
      note: "Fiktív mintaügyfél teszteléshez és képernyőképekhez."
    }
  ] : [];

  const quoteId = "quote-demo";
  return {
    settings: {
      companyName: demoMode ? "Demo Kivitelező Kft." : "",
      companyAddress: demoMode ? "1111 Budapest, Példa utca 2." : "",
      companyPhone: "+36 30 000 0000",
      companyEmail: "ajanlat@example.invalid",
      defaultMargin: 32,
      vat: 27,
      paymentNote: demoMode ? "Minden mintaadat fiktív, kizárólag teszteléshez és képernyőképekhez." : "Az ajánlat a helyszíni felmérésig tájékoztató jellegű.",
      validityDays: 15,
      defaultProductionDeadline: "6-8 hét"
    },
    customers,
    catalog: {
      profiles,
      matrices,
      colors: [
        { id: "color-white", name: "Fehér", type: "percent", outsideValue: 0, bothValue: 0 },
        { id: "color-anthracite", name: "Antracit fólia", type: "percent", outsideValue: 25, bothValue: 38 },
        { id: "color-golden-oak", name: "Aranytölgy", type: "percent", outsideValue: 22, bothValue: 34 },
        { id: "color-ral", name: "Egyedi RAL", type: "percent", outsideValue: 35, bothValue: 52 }
      ],
      glasses: [
        { id: "glass-2", name: "2 rtg Ug 1.0", layers: 2, ug: 1, type: "percent", value: 0 },
        { id: "glass-3", name: "3 rtg Ug 0.6", layers: 3, ug: 0.6, type: "percent", value: 18 }
      ],
      extensions: [
        { id: "ext-30", mm: 30, pricePerM: 2100 },
        { id: "ext-50", mm: 50, pricePerM: 3200 },
        { id: "ext-100", mm: 100, pricePerM: 5200 }
      ],
      accessories: [
        { id: "shutter-al-manual", category: "shutter", name: "Alumínium redőny, kézi", pricing: "width", price: 16500 },
        { id: "shutter-al-motor", category: "shutter", name: "Alumínium motoros redőny", pricing: "width", price: 28500 },
        { id: "mosquito-isso", category: "mosquito", name: "ISSO alumínium szúnyogháló", pricing: "area", price: 11500 },
        { id: "mosquito-plisse", category: "mosquito", name: "Pliszé szúnyogháló", pricing: "area", price: 22500 },
        { id: "install-window", category: "install", name: "Beépítés purhabbal", pricing: "perimeter", price: 6800 },
        { id: "install-door", category: "install", name: "Ajtó beépítés", pricing: "fixed", price: 42000 },
        { id: "install-shutter", category: "install", name: "Redőny beépítés", pricing: "width", price: 6500 },
        { id: "install-mosquito", category: "install", name: "Szúnyogháló beépítés", pricing: "fixed", price: 8500 }
      ],
      interiorDoors: createInteriorDoorSeed(),
      exteriorOpenings: openingTypes
    },
    openingImages: {},
    quotes: demoMode ? [
      {
        id: quoteId,
        number: "AJ-2026-0001",
        customerId: customers[0].id,
        projectAddress: "1111 Budapest, Példa utca 1.",
        status: "Vázlat",
        createdAt,
        updatedAt: createdAt,
        version: 1,
        statusHistory: [{ status: "Vázlat", at: createdAt, note: "Kezdő állapot" }],
        productionDeadline: "6-8 hét",
        margin: 32,
        vat: 27,
        note: "Fiktív mintaajánlat, az árak cserélhetők saját ármátrixra.",
        items: [
          {
            id: "item-1",
            productTypeId: "window",
            openingTypeId: "tilt-turn",
            profileId: profiles[0].id,
            width: 1200,
            height: 1500,
            quantity: 3,
            colorId: "color-anthracite",
            glassId: "glass-3",
            extensionMm: 50,
            extensionPlacement: "Méreten kívül",
            extensionSides: { left: true, right: true, top: true, bottom: false },
            shutterId: "shutter-al-motor",
            mosquitoId: "mosquito-isso",
            installId: "install-window",
            shutterInstallId: "install-shutter",
            mosquitoInstallId: "install-mosquito",
            colorMode: "outside",
            note: "Nappali utcafront."
          },
          {
            id: "item-2",
            productTypeId: "balcony",
            openingTypeId: "balcony",
            profileId: profiles[1].id,
            width: 900,
            height: 2100,
            quantity: 1,
            colorId: "color-white",
            glassId: "glass-3",
            extensionMm: 30,
            extensionPlacement: "Méreten belül",
            extensionSides: { left: false, right: false, top: true, bottom: false },
            shutterId: "",
            mosquitoId: "",
            installId: "install-window",
            shutterInstallId: "",
            mosquitoInstallId: "",
            colorMode: "both",
            note: "Terasz kijárat."
          },
          {
            id: "item-3",
            productTypeId: "interior-door",
            openingTypeId: "door",
            profileId: profiles[0].id,
            width: 900,
            height: 2100,
            quantity: 2,
            colorId: "color-white",
            glassId: "glass-2",
            extensionMm: "",
            extensionPlacement: "Méreten kívül",
            extensionSides: { left: false, right: false, top: false, bottom: false },
            shutterId: "",
            mosquitoId: "",
            installId: "install-door",
            shutterInstallId: "",
            mosquitoInstallId: "",
            interiorManufacturerId: "int-manufacturer-custom",
            interiorFinish: "cpl",
            interiorModelId: "int-model-modern",
            interiorColorId: "int-color-oak",
            interiorFrameId: "int-frame-100-120",
            interiorHandleId: "int-handle-square",
            interiorLockId: "int-lock-bb",
            interiorSizeId: "",
            interiorCustomFrame: true,
            interiorFrameDepthCm: 17,
            note: "Emeleti beltéri ajtók."
          }
        ]
      }
    ] : []
  };
}

function createInteriorDoorSeed() {
  return {
    manufacturers: [
      {
        id: "int-manufacturer-custom",
        name: "Egyedi beltéri gyártó",
        sizing: "custom",
        sizesText: "",
        note: "Egyedi méretben készül, a méret nem módosítja az alapárat."
      },
      {
        id: "int-manufacturer-standard",
        name: "Standard beltéri gyártó",
        sizing: "standard",
        sizesText: "750x2100,900x2100,1000x2100",
        note: "Csak standard méretek."
      }
    ],
    models: [
      {
        id: "int-model-classic",
        manufacturerId: "int-manufacturer-custom",
        name: "Klasszik sík modell",
        decorPrice: 68000,
        cplPrice: 92000,
        customFrameEnabled: true,
        decorIncludedFrameCm: 12,
        cplIncludedFrameCm: 15,
        customFrameSurchargePerCm: 4500,
        note: "Dekor és CPL árral rögzített modell.",
        images: {}
      },
      {
        id: "int-model-modern",
        manufacturerId: "int-manufacturer-custom",
        name: "Modern mart dekoros modell",
        decorPrice: 84000,
        cplPrice: 112000,
        customFrameEnabled: true,
        decorIncludedFrameCm: 12,
        cplIncludedFrameCm: 15,
        customFrameSurchargePerCm: 5200,
        note: "Egyedi méretnél is fix modellár.",
        images: {}
      },
      {
        id: "int-model-standard-line",
        manufacturerId: "int-manufacturer-standard",
        name: "Standard Line",
        decorPrice: 54000,
        cplPrice: 79000,
        customFrameEnabled: false,
        decorIncludedFrameCm: 12,
        cplIncludedFrameCm: 15,
        customFrameSurchargePerCm: 0,
        note: "75/90/100 x 210 cm méretekben.",
        images: {}
      }
    ],
    colors: [
      { id: "int-color-white", name: "Fehér" },
      { id: "int-color-oak", name: "Natúr tölgy" },
      { id: "int-color-walnut", name: "Dió" },
      { id: "int-color-grey", name: "Világosszürke" }
    ],
    frames: [
      { id: "int-frame-75-95", name: "75-95 mm tokvastagság", price: 0 },
      { id: "int-frame-100-120", name: "100-120 mm tokvastagság", price: 8500 },
      { id: "int-frame-125-145", name: "125-145 mm tokvastagság", price: 14500 }
    ],
    handles: [
      { id: "int-handle-basic", name: "Alap kilincs", price: 0 },
      { id: "int-handle-round", name: "Rozettás kilincs", price: 8500 },
      { id: "int-handle-square", name: "Modern szögletes kilincs", price: 14500 }
    ],
    locks: [
      { id: "int-lock-bb", name: "Normál BB zár", price: 0 },
      { id: "int-lock-wc", name: "WC zár", price: 3500 },
      { id: "int-lock-security", name: "Biztonsági zár", price: 9500 }
    ]
  };
}

function createMatrix(profile, type, profileIndex = 0) {
  const widths = range(600, 2600, 100);
  const heights = range(600, 2400, 100);
  const prices = {};
  const profileBase = 25000 + profileIndex * 9000;
  const categoryBoost = type.id === "interior-door" ? 0.62 : 1;
  widths.forEach((width) => {
    heights.forEach((height) => {
      const area = (width * height) / 1000000;
      const perimeter = ((width + height) * 2) / 1000;
      const price = (profileBase + area * 24500 + perimeter * 7800) * type.multiplier * categoryBoost;
      prices[`${width}x${height}`] = Math.round(price / 100) * 100;
    });
  });
  return { widths, heights, prices, blocked: {} };
}

function range(start, end, step) {
  const items = [];
  for (let value = start; value <= end; value += step) items.push(value);
  return items;
}

function matrixKey(profileId, productTypeId) {
  return `${profileId}__${productTypeId}`;
}

function createDefaultItem(currentState = state) {
  const interiorDefaults = getInteriorDefaults(currentState);
  return {
    id: "",
    productTypeId: "window",
    openingTypeId: "tilt-turn",
    profileId: currentState.catalog.profiles[0]?.id || "",
    width: 1200,
    height: 1500,
    quantity: 1,
    colorId: currentState.catalog.colors[0]?.id || "",
    colorMode: "outside",
    glassId: currentState.catalog.glasses[0]?.id || "",
    extensionMm: "",
    extensionPlacement: "Méreten kívül",
    extensionSides: { left: false, right: false, top: false, bottom: false },
    shutterId: "",
    mosquitoId: "",
    installId: "",
    shutterInstallId: "",
    mosquitoInstallId: "",
    interiorManufacturerId: interiorDefaults.manufacturerId,
    interiorFinish: "decor",
    interiorModelId: interiorDefaults.modelId,
    interiorColorId: interiorDefaults.colorId,
    interiorFrameId: interiorDefaults.frameId,
    interiorHandleId: interiorDefaults.handleId,
    interiorLockId: interiorDefaults.lockId,
    interiorSizeId: interiorDefaults.sizeId,
    interiorCustomFrame: false,
    interiorFrameDepthCm: 12,
    note: ""
  };
}

function getInteriorDefaults(currentState = state, manufacturerId = "") {
  const catalog = currentState.catalog.interiorDoors;
  const manufacturer = catalog.manufacturers.find((item) => item.id === manufacturerId) || catalog.manufacturers[0];
  const models = catalog.models.filter((item) => item.manufacturerId === manufacturer?.id);
  const sizes = parseInteriorSizes(manufacturer?.sizesText || "");
  return {
    manufacturerId: manufacturer?.id || "",
    modelId: models[0]?.id || catalog.models[0]?.id || "",
    colorId: catalog.colors[0]?.id || "",
    frameId: catalog.frames[0]?.id || "",
    handleId: catalog.handles[0]?.id || "",
    lockId: catalog.locks[0]?.id || "",
    sizeId: sizes[0]?.id || ""
  };
}

function createCustomerDraft(customer = {}) {
  return {
    id: customer.id || "",
    name: customer.name || "",
    phone: customer.phone || "",
    email: customer.email || "",
    address: customer.address || "",
    note: customer.note || ""
  };
}

function createProfileDraft(profile = {}) {
  return {
    id: profile.id || "",
    manufacturer: profile.manufacturer || "",
    name: profile.name || "",
    category: profile.category || "Kültéri műanyag",
    uf: profile.uf ?? "",
    ug2: profile.ug2 ?? "",
    ug3: profile.ug3 ?? "",
    note: profile.note || ""
  };
}

function createInteriorManufacturerDraft(manufacturer = {}) {
  return {
    id: manufacturer?.id || "",
    name: manufacturer?.name || "",
    sizing: manufacturer?.sizing || "custom",
    sizesText: manufacturer?.sizesText || "",
    note: manufacturer?.note || ""
  };
}

function createInteriorModelDraft(model = {}) {
  return {
    id: model?.id || "",
    manufacturerId: model?.manufacturerId || state.catalog.interiorDoors?.manufacturers?.[0]?.id || "",
    name: model?.name || "",
    decorPrice: model?.decorPrice ?? 0,
    cplPrice: model?.cplPrice ?? 0,
    note: model?.note || "",
    customFrameEnabled: Boolean(model?.customFrameEnabled),
    decorIncludedFrameCm: model?.decorIncludedFrameCm ?? 12,
    cplIncludedFrameCm: model?.cplIncludedFrameCm ?? 15,
    customFrameSurchargePerCm: model?.customFrameSurchargePerCm ?? 0,
    images: model?.images || {}
  };
}

function getSelectedQuote() {
  return state.quotes.find((quote) => quote.id === ui.selectedQuoteId) || state.quotes[0];
}

function getCustomer(id) {
  return state.customers.find((customer) => customer.id === id);
}

function getProfile(id) {
  return state.catalog.profiles.find((profile) => profile.id === id);
}

function getCatalogItem(collection, id) {
  return state.catalog[collection].find((item) => String(item.id) === String(id));
}

function render() {
  const quote = getSelectedQuote();
  app.innerHTML = `
    <div class="app-shell">
      ${renderSidebar()}
      <main class="main">
        ${renderTopbar()}
        <div class="content">
          ${renderContent(quote)}
        </div>
      </main>
    </div>
    ${renderPrintSheet(quote)}
    ${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ""}
  `;
}

function renderSidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">NA</div>
        <div>
          <div class="brand-title">Nyílászáró<br />Ajánlatkészítő</div>
          <div class="brand-subtitle">${APP_MODE === "demo" ? "Demo mód - fiktív adatok" : "Helyi adatbázisú kalkulátor"}</div>
        </div>
      </div>
      <nav class="nav" aria-label="Fő navigáció">
        ${navItems.map((item) => `
          <button class="nav-button ${ui.view === item.id || (item.id === "quotes" && ui.view === "quote-editor") ? "active" : ""}" data-view="${item.id}">
            ${icon(item.icon, "nav-icon")}
            <span>${esc(item.label)}</span>
          </button>
        `).join("")}
      </nav>
      <section>
        <div class="sidebar-section-title">Aktív ajánlatok</div>
        <div class="quote-list">
          ${state.quotes.map((quote) => {
            const customer = getCustomer(quote.customerId);
            const totals = calcQuote(quote);
            return `
              <button class="quote-card ${quote.id === ui.selectedQuoteId ? "active" : ""}" data-action="select-quote" data-id="${quote.id}">
                <strong>${esc(quote.number)} · ${esc(customer?.name || "Nincs ügyfél")}</strong>
                <span>${esc(quote.status)} · ${money(totals.gross)}</span>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    </aside>
  `;
}

function renderTopbar() {
  const meta = getViewMeta();
  return `
    <header class="topbar">
      <div>
        <h1 class="page-title">${esc(meta.title)}</h1>
        <div class="page-subtitle">${esc(meta.subtitle)}</div>
      </div>
      <div class="actions">${meta.actions}</div>
    </header>
  `;
}

function getViewMeta() {
  const quote = getSelectedQuote();
  const actionsByView = {
    quotes: `
      <button class="button" data-action="new-quote">${icon("plus")}Új ajánlat</button>
    `,
    "quote-editor": `
      <button class="button" data-action="open-dashboard">${icon("grid")}Dashboard</button>
      <button class="button" data-action="duplicate-quote">${icon("copy")}Másolás</button>
      <button class="button" data-action="set-quote-status" data-status="Elküldve">${icon("send")}Elküldve</button>
      <button class="button" data-action="set-quote-status" data-status="Elfogadva">${icon("check")}Elfogadva</button>
      <button class="button danger" data-action="set-quote-status" data-status="Elutasítva">${icon("x")}Elutasítva</button>
      <button class="button primary" data-action="print-quote" data-print-mode="customer">${icon("print")}Ügyfél PDF</button>
      <button class="button" data-action="print-quote" data-print-mode="internal">${icon("print")}Belső PDF</button>
    `,
    customers: `<button class="button primary" data-action="new-customer">${icon("plus")}Új ügyfél</button>`,
    profiles: `<button class="button primary" data-action="new-profile">${icon("plus")}Új műanyag profil</button>`,
    interior: `<button class="button primary" data-action="new-interior-model">${icon("plus")}Új ajtómodell</button>`,
    matrices: `<button class="button primary" data-action="fill-matrix">${icon("wand")}Mintaárak újratöltése</button>`,
    extras: `<button class="button primary" data-action="add-color">${icon("plus")}Szín felár</button>`,
    settings: `<button class="button primary" data-action="export-backup">${icon("download")}Biztonsági mentés</button>`
  };
  const titles = {
    quotes: {
      title: "Ajánlatok dashboard",
      subtitle: "Árajánlatok állapota, dátumai, összegei és gyors műveletei egy helyen."
    },
    "quote-editor": {
      title: quote ? `${quote.number} ajánlat` : "Ajánlat szerkesztő",
      subtitle: "Tételek, rajzos előnézet, beszerzési ár és ügyfélár egy helyen."
    },
    customers: { title: "Ügyféladatbázis", subtitle: "Név, cím, telefon, email és projekt megjegyzések." },
    profiles: { title: "Műanyag nyílászárók", subtitle: "Gyártók, profilok és kültéri nyitástípusok: ablak, erkélyajtó, bejárati ajtó." },
    interior: { title: "Beltéri ajtók", subtitle: "Gyártók, Dekor/CPL modellárak, színek, tokvastagság, kilincs, zár és képek." },
    matrices: { title: "Ármátrixok", subtitle: "100 mm-es raszter, méret alapján felfelé kerekített árazás." },
    extras: { title: "Kiegészítők", subtitle: "Színek, üvegezés, toktoldók, redőnyök, szúnyoghálók és beépítés." },
    settings: { title: "Beállítások", subtitle: "Cégadatok, alap haszonkulcs, ÁFA és adatmentés." }
  };
  return { ...titles[ui.view], actions: actionsByView[ui.view] || "" };
}

function renderContent(quote) {
  if (ui.view === "quotes") return renderQuotesDashboard();
  if (ui.view === "quote-editor") return renderQuotesView(quote);
  if (ui.view === "customers") return renderCustomersView();
  if (ui.view === "profiles") return renderProfilesView();
  if (ui.view === "interior") return renderInteriorDoorsView();
  if (ui.view === "matrices") return renderMatricesView();
  if (ui.view === "extras") return renderExtrasView();
  if (ui.view === "settings") return renderSettingsView();
  return "";
}

function renderQuotesView(quote) {
  if (!quote) {
    return `<div class="empty">Még nincs ajánlat. Hozz létre egyet az Új ajánlat gombbal.</div>`;
  }
  const customer = getCustomer(quote.customerId);
  const draftCalc = calcItem(ui.itemDraft, quote);
  const totals = calcQuote(quote);
  return `
    <div class="quote-workspace">
      <div class="workspace-main">
        <section class="panel flat">
          <div class="panel-body">
            <div class="form-grid four">
              <div class="field">
                <label>Ügyfél</label>
                <select data-bind-quote="customerId">
                  ${state.customers.map((item) => `<option value="${item.id}" ${item.id === quote.customerId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label>Ajánlatszám</label>
                <input data-bind-quote="number" value="${esc(quote.number)}" />
              </div>
              <div class="field">
                <label>Haszonkulcs (%)</label>
                <input type="number" min="0" step="1" data-bind-quote="margin" value="${esc(quote.margin)}" />
              </div>
              <div class="field">
                <label>ÁFA</label>
                <select data-bind-quote="vat">
                  ${vatOptions().map((option) => `<option value="${option.value}" ${String(quote.vat) === String(option.value) ? "selected" : ""}>${esc(option.label)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label>Gyártási határidő</label>
                <input data-bind-quote="productionDeadline" value="${esc(quote.productionDeadline || state.settings.defaultProductionDeadline || "")}" />
              </div>
              <div class="field full">
                <label>Projekt címe</label>
                <input data-bind-quote="projectAddress" value="${esc(quote.projectAddress || customer?.address || "")}" />
              </div>
            </div>
          </div>
        </section>

        <div class="split">
          ${renderItemEditor(quote, draftCalc)}
          ${renderPreviewPanel(draftCalc)}
        </div>

        ${renderItemsTable(quote)}
      </div>

      <aside class="price-stack">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Ajánlat összesítő</h2>
              <p class="panel-note">Beszerzési ár belső nézetben, ügyfélár PDF-be.</p>
            </div>
          </div>
          <div class="panel-body summary-list">
            ${summaryRow("Tételek száma", `${quote.items.length} db`)}
            ${summaryRow("Beszerzési ár", money(totals.cost), "internal-only")}
            ${summaryRow("Haszonkulcs", `${number(quote.margin)}%`)}
            ${summaryRow("Ügyfélár nettó", money(totals.net))}
            ${summaryRow(`ÁFA ${vatLabel(quote)}`, money(totals.vatAmount))}
            ${summaryRow("Fizetendő bruttó", money(totals.gross), "total")}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Aktív tétel ára</h2>
              <p class="panel-note">A szerkesztett tétel kalkulációja.</p>
            </div>
          </div>
          <div class="panel-body summary-list">
            ${summaryRow(draftCalc.priceBasisLabel, draftCalc.priceBasisValue)}
            ${summaryRow("Alapár", money(draftCalc.parts.base))}
            ${summaryRow(draftCalc.parts.colorLabel || "Szín felár", money(draftCalc.parts.color))}
            ${summaryRow(draftCalc.parts.glassLabel || "Üvegezés felár", money(draftCalc.parts.glass))}
            ${summaryRow(draftCalc.parts.extensionLabel || "Toktoldó", money(draftCalc.parts.extension))}
            ${summaryRow("Kiegészítők", money(draftCalc.parts.accessories))}
            ${summaryRow("Beépítés", money(draftCalc.parts.installation))}
            ${summaryRow("Tétel beszerzés", money(draftCalc.cost), "internal-only")}
            ${summaryRow("Tétel ügyfél bruttó", money(draftCalc.gross), "total")}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function summaryRow(label, value, extraClass = "") {
  return `
    <div class="summary-row ${extraClass}">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
    </div>
  `;
}

function vatOptions() {
  return [
    { value: "0", label: "0%" },
    { value: "5", label: "5%" },
    { value: "27", label: "27%" },
    { value: "FAD", label: "FAD" }
  ];
}

function renderQuotesDashboard() {
  const metrics = quoteDashboardMetrics();
  const filteredQuotes = getFilteredQuotes();
  return `
    <div class="workspace-main">
      <section class="dashboard-hero">
        <div>
          <h2>Árajánlat áttekintés</h2>
          <p>Gyors státuszkezelés, PDF export, törlés és megnyitás szerkesztésre.</p>
        </div>
        <button class="button primary" data-action="new-quote">${icon("plus")}Új ajánlat</button>
      </section>

      <div class="dashboard-metrics">
        ${dashboardMetric("Összes ajánlat", `${metrics.count} db`, "Teljes ajánlatállomány")}
        ${dashboardMetric("Elfogadva", `${metrics.accepted} db`, money(metrics.acceptedGross))}
        ${dashboardMetric("Vázlat / folyamatban", `${metrics.open} db`, "Szerkeszthető ajánlatok")}
        ${dashboardMetric("Elutasítva", `${metrics.rejected} db`, "Lezárt vesztes ajánlatok")}
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Ajánlatok</h2>
            <p class="panel-note">Kattints a Megnyitás gombra a részletes szerkesztőhöz. Szűrt találat: ${filteredQuotes.length} db.</p>
          </div>
        </div>
        <div class="form-grid four" style="margin-bottom: 14px;">
          <label>
            Keresés
            <input data-dashboard-search value="${esc(ui.quoteSearch)}" placeholder="Ajánlatszám, ügyfél, cím" />
          </label>
          <label>
            Állapot
            <select data-dashboard-status>
              ${quoteStatusOptions().map((status) => `<option value="${esc(status.value)}" ${ui.quoteStatusFilter === status.value ? "selected" : ""}>${esc(status.label)}</option>`).join("")}
            </select>
          </label>
          <label>
            Ügyfél
            <select data-dashboard-customer>
              <option value="all" ${ui.quoteCustomerFilter === "all" ? "selected" : ""}>Összes ügyfél</option>
              ${state.customers.map((customer) => `<option value="${esc(customer.id)}" ${ui.quoteCustomerFilter === customer.id ? "selected" : ""}>${esc(customer.name || "Névtelen ügyfél")}</option>`).join("")}
            </select>
          </label>
          <label>
            Készült ettől
            <input type="date" data-dashboard-created-from value="${esc(ui.quoteCreatedFrom)}" />
          </label>
        </div>
        <div class="form-grid three" style="margin-bottom: 14px;">
          <label>
            Határidő
            <input data-dashboard-deadline value="${esc(ui.quoteDeadlineFilter)}" placeholder="pl. 6-8 hét" />
          </label>
          <label>
            Rendezés
            <input value="Legutóbb módosított elöl" disabled />
          </label>
          <div></div>
        </div>
        <div class="table-wrap">
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>Ajánlat</th>
                <th>Ügyfél</th>
                <th>Készült</th>
                <th>Módosítva</th>
                <th>Állapot</th>
                <th>Verzió</th>
                <th>Tételek</th>
                <th>Határidő</th>
                <th class="numeric">Nettó</th>
                <th class="numeric">Bruttó</th>
                <th>Műveletek</th>
              </tr>
            </thead>
            <tbody>
              ${filteredQuotes.map((quote) => renderDashboardQuoteRow(quote)).join("") || `<tr><td colspan="11"><div class="empty">${state.quotes.length ? "Nincs találat." : "Még nincs ajánlat."}</div></td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function dashboardMetric(label, value, note) {
  return `
    <div class="metric-card">
      <span>${esc(label)}</span>
      <strong>${esc(value)}</strong>
      <small>${esc(note)}</small>
    </div>
  `;
}

function renderDashboardQuoteRow(quote) {
  const customer = getCustomer(quote.customerId);
  const totals = calcQuote(quote);
  const latestStatus = quote.statusHistory?.[quote.statusHistory.length - 1];
  return `
    <tr>
      <td>
        <strong>${esc(quote.number)}</strong>
        <div class="data-card-meta">${esc(quote.projectAddress || customer?.address || "Nincs projekt cím")}</div>
      </td>
      <td>${esc(customer?.name || "Nincs ügyfél")}</td>
      <td>${esc(quote.createdAt || "-")}</td>
      <td>${esc(quote.updatedAt || quote.createdAt || "-")}</td>
      <td>
        <span class="status-pill ${statusClass(quote.status)}">${esc(quote.status || "Vázlat")}</span>
        <div class="data-card-meta">${esc(latestStatus ? `${latestStatus.at} · ${latestStatus.note || latestStatus.status}` : "Nincs státusztörténet")}</div>
      </td>
      <td>v${number(quote.version || 1)}</td>
      <td>${quote.items.length} db</td>
      <td>${esc(quote.productionDeadline || state.settings.defaultProductionDeadline || "-")}</td>
      <td class="numeric">${money(totals.net)}</td>
      <td class="numeric"><strong>${money(totals.gross)}</strong></td>
      <td>
        <div class="row-actions">
          <button class="button" data-action="select-quote" data-id="${quote.id}">${icon("edit")}Megnyitás</button>
          <button class="button" data-action="dashboard-print-quote" data-id="${quote.id}" data-print-mode="customer">${icon("print")}PDF</button>
          <button class="button" data-action="dashboard-print-quote" data-id="${quote.id}" data-print-mode="internal">${icon("print")}Belső</button>
          <button class="button" data-action="set-quote-status" data-id="${quote.id}" data-status="Elküldve">${icon("send")}Elküldve</button>
          <button class="button" data-action="set-quote-status" data-id="${quote.id}" data-status="Elfogadva">${icon("check")}Elfogad</button>
          <button class="button" data-action="set-quote-status" data-id="${quote.id}" data-status="Elutasítva">${icon("x")}Elutasít</button>
          <button class="button danger icon-only" title="Törlés" data-action="delete-quote" data-id="${quote.id}">${icon("trash")}</button>
        </div>
      </td>
    </tr>
  `;
}

function getFilteredQuotes() {
  const term = String(ui.quoteSearch || "").trim().toLowerCase();
  return state.quotes
    .filter((quote) => ui.quoteStatusFilter === "all" || quote.status === ui.quoteStatusFilter)
    .filter((quote) => ui.quoteCustomerFilter === "all" || quote.customerId === ui.quoteCustomerFilter)
    .filter((quote) => !ui.quoteCreatedFrom || String(quote.createdAt || "") >= ui.quoteCreatedFrom)
    .filter((quote) => !ui.quoteDeadlineFilter || String(quote.productionDeadline || "").toLowerCase().includes(ui.quoteDeadlineFilter.toLowerCase()))
    .filter((quote) => {
      if (!term) return true;
      const customer = getCustomer(quote.customerId);
      return [
        quote.number,
        quote.status,
        quote.projectAddress,
        quote.productionDeadline,
        customer?.name,
        customer?.address
      ].some((value) => String(value || "").toLowerCase().includes(term));
    })
    .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
}

function quoteStatusOptions() {
  return [
    { value: "all", label: "Összes állapot" },
    { value: "Vázlat", label: "Vázlat" },
    { value: "Elküldve", label: "Elküldve" },
    { value: "Elfogadva", label: "Elfogadva" },
    { value: "Elutasítva", label: "Elutasítva" }
  ];
}

function quoteDashboardMetrics() {
  return state.quotes.reduce((acc, quote) => {
    const totals = calcQuote(quote);
    acc.count += 1;
    if (quote.status === "Elfogadva") {
      acc.accepted += 1;
      acc.acceptedGross += totals.gross;
    } else if (quote.status === "Elutasítva") {
      acc.rejected += 1;
    } else {
      acc.open += 1;
    }
    return acc;
  }, { count: 0, accepted: 0, rejected: 0, open: 0, acceptedGross: 0 });
}

function statusClass(status) {
  if (status === "Elfogadva") return "accepted";
  if (status === "Elutasítva") return "rejected";
  if (status === "Elküldve") return "sent";
  return "draft";
}

function renderItemEditor(quote, draftCalc) {
  const draft = ui.itemDraft;
  const isInterior = draft.productTypeId === "interior-door";
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">${ui.selectedItemId ? "Tétel szerkesztése" : "Új tétel"}</h2>
          <p class="panel-note">${isInterior ? "Beltéri ajtónál modellalapár, kivitel, tok, kilincs és zár alapján számolunk." : "Válaszd ki a típust, profilt, üveget, színt és kiegészítőket."}</p>
        </div>
        <button class="button icon-only" title="Új tétel" data-action="clear-item">${icon("plus")}</button>
      </div>
      <div class="panel-body">
        ${isInterior ? renderInteriorItemFields(draft) : renderExteriorItemFields(draft)}

        <div class="actions" style="justify-content: space-between; margin-top: 16px;">
          <button class="button danger" data-action="delete-item" ${ui.selectedItemId ? "" : "disabled"}>${icon("trash")}Tétel törlése</button>
          <button class="button primary" data-action="save-item">${icon("save")}${ui.selectedItemId ? "Tétel frissítése" : "Tétel hozzáadása"}</button>
        </div>
        <p class="panel-note">Aktív tétel nettó beszerzési ára: <strong>${money(draftCalc.cost)}</strong></p>
        ${draftCalc.blocked ? `<div class="warning-box">${icon("alert")}Ez a méret az ármátrixban nem gyárthatóként van jelölve, ezért a rendszer nem számol rá árat.</div>` : ""}
      </div>
    </section>
  `;
}

function renderExteriorItemFields(draft) {
  return `
    <div class="form-grid">
      <div class="field">
        <label>Nyílászáró típus</label>
        <select data-bind-item="productTypeId">
          ${productTypes.map((item) => `<option value="${item.id}" ${item.id === draft.productTypeId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Nyitáskép</label>
        <select data-bind-item="openingTypeId">
          ${exteriorOpeningTypes().map((item) => `<option value="${item.id}" ${item.id === draft.openingTypeId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field full">
        <label>Gyártó / profil</label>
        <select data-bind-item="profileId">
          ${state.catalog.profiles.map((profile) => `<option value="${profile.id}" ${profile.id === draft.profileId ? "selected" : ""}>${esc(profile.manufacturer)} · ${esc(profile.name)}</option>`).join("")}
        </select>
      </div>
      ${dimensionFields(draft)}
      <div class="field">
        <label>Szín</label>
        <select data-bind-item="colorId">
          ${state.catalog.colors.map((item) => `<option value="${item.id}" ${item.id === draft.colorId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Színezés</label>
        <select data-bind-item="colorMode">
          <option value="outside" ${draft.colorMode === "outside" ? "selected" : ""}>Kívül színes</option>
          <option value="both" ${draft.colorMode === "both" ? "selected" : ""}>Kívül-belül színes</option>
        </select>
      </div>
      <div class="field">
        <label>Üvegezés</label>
        <select data-bind-item="glassId">
          ${state.catalog.glasses.map((item) => `<option value="${item.id}" ${item.id === draft.glassId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Toktoldó</label>
        <select data-bind-item="extensionMm">
          <option value="">Nincs</option>
          ${state.catalog.extensions.map((item) => `<option value="${item.mm}" ${String(item.mm) === String(draft.extensionMm) ? "selected" : ""}>${esc(item.mm)} mm · ${money(item.pricePerM)}/fm</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Toktoldó helye</label>
        <select data-bind-item="extensionPlacement">
          ${["Méreten kívül", "Méreten belül"].map((item) => `<option ${item === draft.extensionPlacement ? "selected" : ""}>${esc(item)}</option>`).join("")}
        </select>
      </div>
      <div class="field full">
        <span class="field-label">Toktoldó oldalai</span>
        <div class="inline-checks">
          ${["left:Bal", "right:Jobb", "top:Felül", "bottom:Alul"].map((pair) => {
            const [key, label] = pair.split(":");
            return `<label class="check"><input type="checkbox" data-side="${key}" ${draft.extensionSides?.[key] ? "checked" : ""} />${label}</label>`;
          }).join("")}
        </div>
      </div>
      <div class="field">
        <label>Redőny</label>
        <select data-bind-item="shutterId">
          <option value="">Nincs</option>
          ${accessoriesBy("shutter").map((item) => `<option value="${item.id}" ${item.id === draft.shutterId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Redőny beépítés</label>
        <select data-bind-item="shutterInstallId">
          <option value="">Nincs</option>
          ${accessoriesBy("install").map((item) => `<option value="${item.id}" ${item.id === draft.shutterInstallId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Szúnyogháló</label>
        <select data-bind-item="mosquitoId">
          <option value="">Nincs</option>
          ${accessoriesBy("mosquito").map((item) => `<option value="${item.id}" ${item.id === draft.mosquitoId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Szúnyogháló beépítés</label>
        <select data-bind-item="mosquitoInstallId">
          <option value="">Nincs</option>
          ${accessoriesBy("install").map((item) => `<option value="${item.id}" ${item.id === draft.mosquitoInstallId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Nyílászáró beépítés</label>
        <select data-bind-item="installId">
          <option value="">Nincs</option>
          ${accessoriesBy("install").map((item) => `<option value="${item.id}" ${item.id === draft.installId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>UF / UG információ</label>
        <input readonly value="${esc(formatThermalInfo(draft))}" />
      </div>
      ${noteField(draft)}
    </div>
  `;
}

function renderInteriorItemFields(draft) {
  const catalog = state.catalog.interiorDoors;
  const manufacturer = interiorManufacturer(draft.interiorManufacturerId);
  const models = interiorModelsForManufacturer(draft.interiorManufacturerId);
  const model = interiorModel(draft.interiorModelId);
  const sizes = parseInteriorSizes(manufacturer?.sizesText || "");
  return `
    <div class="form-grid">
      <div class="field">
        <label>Nyílászáró típus</label>
        <select data-bind-item="productTypeId">
          ${productTypes.map((item) => `<option value="${item.id}" ${item.id === draft.productTypeId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Gyártó</label>
        <select data-bind-item="interiorManufacturerId">
          ${catalog.manufacturers.map((item) => `<option value="${item.id}" ${item.id === draft.interiorManufacturerId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>1. tétel: kivitel</label>
        <select data-bind-item="interiorFinish">
          ${interiorFinishOptions.map((item) => `<option value="${item.id}" ${item.id === draft.interiorFinish ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>2. tétel: ajtó modell</label>
        <select data-bind-item="interiorModelId">
          ${models.map((item) => `<option value="${item.id}" ${item.id === draft.interiorModelId ? "selected" : ""}>${esc(item.name)} · Dekor ${money(item.decorPrice)} / CPL ${money(item.cplPrice)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Szín</label>
        <select data-bind-item="interiorColorId">
          ${catalog.colors.map((item) => `<option value="${item.id}" ${item.id === draft.interiorColorId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      ${manufacturer?.sizing === "custom" && model?.customFrameEnabled ? `
        <div class="field full">
          <span class="field-label">3. tétel: tokvastagság</span>
          <label class="check" style="width: max-content;">
            <input type="checkbox" data-bool-item="interiorCustomFrame" ${draft.interiorCustomFrame ? "checked" : ""} />
            Egyedi tok centiméteres felárral
          </label>
        </div>
        ${draft.interiorCustomFrame ? `
          <div class="field">
            <label>Tényleges tokvastagság (cm)</label>
            <input type="number" min="1" step="0.5" data-bind-item="interiorFrameDepthCm" value="${esc(draft.interiorFrameDepthCm)}" />
          </div>
          <div class="field">
            <label>Alapáras határ</label>
            <input readonly value="${esc(interiorIncludedFrameCm(model, draft.interiorFinish))} cm-ig alapáras" />
          </div>
        ` : renderInteriorFrameSelect(catalog, draft)}
      ` : renderInteriorFrameSelect(catalog, draft)}
      <div class="field">
        <label>4. tétel: kilincs típusa</label>
        <select data-bind-item="interiorHandleId">
          ${catalog.handles.map((item) => `<option value="${item.id}" ${item.id === draft.interiorHandleId ? "selected" : ""}>${esc(item.name)} · ${money(item.price)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>5. tétel: zár típusa</label>
        <select data-bind-item="interiorLockId">
          ${catalog.locks.map((item) => `<option value="${item.id}" ${item.id === draft.interiorLockId ? "selected" : ""}>${esc(item.name)} · ${money(item.price)}</option>`).join("")}
        </select>
      </div>
      ${manufacturer?.sizing === "standard" ? `
        <div class="field">
          <label>Standard méret</label>
          <select data-bind-item="interiorSizeId">
            ${sizes.map((item) => `<option value="${item.id}" ${item.id === draft.interiorSizeId ? "selected" : ""}>${esc(item.label)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Mennyiség</label>
          <input type="number" min="1" step="1" data-bind-item="quantity" value="${esc(draft.quantity)}" />
        </div>
      ` : dimensionFields(draft)}
      <div class="field">
        <label>Beépítés</label>
        <select data-bind-item="installId">
          <option value="">Nincs</option>
          ${accessoriesBy("install").map((item) => `<option value="${item.id}" ${item.id === draft.installId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Árazási mód</label>
        <input readonly value="${manufacturer?.sizing === "standard" ? "Standard méretű ajtó" : "Egyedi méret, fix modellár"}" />
      </div>
      ${noteField(draft)}
    </div>
  `;
}

function dimensionFields(draft) {
  return `
    <div class="field">
      <label>Szélesség (mm)</label>
      <input type="number" min="100" step="10" data-bind-item="width" value="${esc(draft.width)}" />
    </div>
    <div class="field">
      <label>Magasság (mm)</label>
      <input type="number" min="100" step="10" data-bind-item="height" value="${esc(draft.height)}" />
    </div>
    <div class="field">
      <label>Mennyiség</label>
      <input type="number" min="1" step="1" data-bind-item="quantity" value="${esc(draft.quantity)}" />
    </div>
  `;
}

function renderInteriorFrameSelect(catalog, draft) {
  return `
    <div class="field">
      <label>3. tétel: tokvastagság</label>
      <select data-bind-item="interiorFrameId">
        ${catalog.frames.map((item) => `<option value="${item.id}" ${item.id === draft.interiorFrameId ? "selected" : ""}>${esc(item.name)} · ${money(item.price)}</option>`).join("")}
      </select>
    </div>
  `;
}

function noteField(draft) {
  return `
    <div class="field full">
      <label>Megjegyzés</label>
      <textarea data-bind-item="note">${esc(draft.note)}</textarea>
    </div>
  `;
}

function renderPreviewPanel(calc) {
  const draft = ui.itemDraft;
  const image = draft.productTypeId === "interior-door" ? getInteriorDoorImage(draft) : state.openingImages?.[draft.openingTypeId];
  const previewTitle = draft.productTypeId === "interior-door" ? interiorItemTitle(draft) : openingName(draft.openingTypeId);
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Rajzos előnézet</h2>
          <p class="panel-note">PDF exportban az ügyfél is ezt a nyitásképet látja.</p>
        </div>
      </div>
      <div class="panel-body preview-wrap">
        <div class="drawing-stage">
          ${image ? `<img class="preview-image" src="${image}" alt="${esc(previewTitle)}" />` : renderOpeningSvg(draft.openingTypeId, draft.width, draft.height)}
        </div>
        <div class="tag-row">
          <span class="tag teal">${esc(previewTitle)}</span>
          <span class="tag">${number(draft.width)} x ${number(draft.height)} mm</span>
          <span class="tag amber">${esc(calc.matrixNote)}</span>
        </div>
      </div>
    </section>
  `;
}

function renderItemsTable(quote) {
  if (!quote.items.length) {
    return `
      <section class="panel">
        <div class="panel-header"><h2 class="panel-title">Ajánlati tételek</h2></div>
        <div class="panel-body"><div class="empty">Még nincs tétel az ajánlatban.</div></div>
      </section>
    `;
  }
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Ajánlati tételek</h2>
          <p class="panel-note">Kattints egy sorra a szerkesztéshez.</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tétel</th>
              <th>Méret</th>
              <th>Opciók</th>
              <th class="numeric internal-only">Beszerzés</th>
              <th class="numeric">Ügyfél nettó</th>
              <th class="numeric">Bruttó</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map((item) => {
              const calc = calcItem(item, quote);
              return `
                <tr class="selectable ${ui.selectedItemId === item.id ? "active" : ""}" data-action="select-item" data-id="${item.id}">
                  <td>
                    <strong>${esc(itemTitle(item))}</strong><br />
                    <span class="panel-note">${esc(itemSubtitle(item))} · ${number(item.quantity)} db</span>
                  </td>
                  <td>${number(item.width)} x ${number(item.height)} mm</td>
                  <td>
                    <div class="tag-row">${itemOptionTags(item)}</div>
                  </td>
                  <td class="numeric internal-only">${money(calc.cost)}</td>
                  <td class="numeric">${money(calc.net)}</td>
                  <td class="numeric"><strong>${money(calc.gross)}</strong></td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderCustomersView() {
  return `
    <div class="manage-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">${ui.customerDraft.id ? "Ügyfél szerkesztése" : "Új ügyfél"}</h2>
            <p class="panel-note">Az ajánlatokhoz választható ügyféladatok.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="form-grid">
            ${field("Név", "name", ui.customerDraft.name, "customer")}
            ${field("Telefon", "phone", ui.customerDraft.phone, "customer")}
            ${field("Email", "email", ui.customerDraft.email, "customer")}
            ${field("Cím", "address", ui.customerDraft.address, "customer")}
            ${field("Megjegyzés", "note", ui.customerDraft.note, "customer", true)}
          </div>
          <div class="actions" style="margin-top: 16px;">
            <button class="button" data-action="new-customer">${icon("plus")}Új</button>
            <button class="button primary" data-action="save-customer">${icon("save")}Mentés</button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Ügyfelek</h2>
            <p class="panel-note">${state.customers.length} mentett ügyfél.</p>
          </div>
        </div>
        <div class="panel-body list-grid">
          ${state.customers.map((customer) => `
            <div class="data-card ${ui.customerDraft.id === customer.id ? "selected" : ""}">
              <div class="data-card-title">
                <span>${esc(customer.name)}</span>
                <span class="tag">${esc(customer.phone || "nincs telefon")}</span>
              </div>
              <div class="data-card-meta">${esc(customer.address || "Nincs cím")} · ${esc(customer.email || "Nincs email")}</div>
              <div class="actions" style="justify-content: flex-start;">
                <button class="button" data-action="edit-customer" data-id="${customer.id}">${icon("edit")}Szerkesztés</button>
                <button class="button danger" data-action="delete-customer" data-id="${customer.id}">${icon("trash")}Törlés</button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderProfilesView() {
  return `
    <div class="workspace-main">
      <div class="manage-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${ui.profileDraft.id ? "Profil szerkesztése" : "Új műanyag profil"}</h2>
              <p class="panel-note">A hőtechnikai értékek a PDF-ben is feltüntethetők.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              ${field("Gyártó", "manufacturer", ui.profileDraft.manufacturer, "profile")}
              ${field("Profil / típus", "name", ui.profileDraft.name, "profile")}
              ${selectField("Kategória", "category", ui.profileDraft.category, "profile", ["Kültéri műanyag", "Kültéri ajtó"])}
              ${field("UF", "uf", ui.profileDraft.uf, "profile", false, "number")}
              ${field("UG 2 rtg", "ug2", ui.profileDraft.ug2, "profile", false, "number")}
              ${field("UG 3 rtg", "ug3", ui.profileDraft.ug3, "profile", false, "number")}
              ${field("Megjegyzés", "note", ui.profileDraft.note, "profile", true)}
            </div>
            <div class="actions" style="margin-top: 16px;">
              <button class="button" data-action="new-profile">${icon("plus")}Új</button>
              <button class="button primary" data-action="save-profile">${icon("save")}Mentés</button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Műanyag profil lista</h2>
              <p class="panel-note">Ablak, erkélyajtó és bejárati ajtó profilok ármátrixokkal.</p>
            </div>
          </div>
          <div class="panel-body list-grid">
            ${state.catalog.profiles.map((profile) => `
              <div class="data-card ${ui.profileDraft.id === profile.id ? "selected" : ""}">
                <div class="data-card-title">
                  <span>${esc(profile.manufacturer)} · ${esc(profile.name)}</span>
                  <span class="tag teal">${esc(profile.category)}</span>
                </div>
                <div class="data-card-meta">UF ${esc(profile.uf || "-")} · UG 2rtg ${esc(profile.ug2 || "-")} · UG 3rtg ${esc(profile.ug3 || "-")}</div>
                <div class="actions" style="justify-content: flex-start;">
                  <button class="button" data-action="edit-profile" data-id="${profile.id}">${icon("edit")}Szerkesztés</button>
                  <button class="button danger" data-action="delete-profile" data-id="${profile.id}">${icon("trash")}Törlés</button>
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Műanyag nyílászáró típusok</h2>
            <p class="panel-note">Itt látszanak és bővíthetők az ajánlat tételválasztói: bukó, BNY, KFNY, kétszárnyú, erkélyajtó, bejárati ajtó. A termékkategória mező mondja meg, melyik ármátrixból számoljon.</p>
          </div>
          <button class="button" data-action="add-exterior-opening">${icon("plus")}Új típus</button>
        </div>
        ${editableTable("exteriorOpenings", state.catalog.exteriorOpenings, [
          ["name", "Megnevezés"],
          ["productTypeId", "Termékkategória"],
          ["note", "Megjegyzés"]
        ])}
      </section>
    </div>
  `;
}

function renderInteriorDoorsView() {
  ensureInteriorUiDefaults();
  const catalog = state.catalog.interiorDoors;
  const selectedManufacturer = interiorManufacturer(ui.selectedInteriorManufacturerId);
  const visibleModels = interiorModelsForManufacturer(selectedManufacturer?.id);
  const imageModel = interiorModel(ui.selectedInteriorModelId) || visibleModels[0] || catalog.models[0];
  const imageColor = interiorColor(ui.selectedInteriorImageColorId) || catalog.colors[0];
  const image = imageModel?.images?.[imageColor?.id];
  return `
    <div class="workspace-main">
      <div class="manage-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${ui.interiorManufacturerDraft.id ? "Beltéri gyártó szerkesztése" : "Új beltéri gyártó"}</h2>
              <p class="panel-note">Egyedi méretes vagy standard méretes gyártó.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              ${field("Gyártó neve", "name", ui.interiorManufacturerDraft.name, "interior-manufacturer")}
              <div class="field">
                <label>Méretezés</label>
                <select data-bind-interior-manufacturer="sizing">
                  <option value="custom" ${ui.interiorManufacturerDraft.sizing === "custom" ? "selected" : ""}>Egyedi méret</option>
                  <option value="standard" ${ui.interiorManufacturerDraft.sizing === "standard" ? "selected" : ""}>Standard méret</option>
                </select>
              </div>
              ${field("Standard méretek", "sizesText", ui.interiorManufacturerDraft.sizesText, "interior-manufacturer")}
              ${field("Megjegyzés", "note", ui.interiorManufacturerDraft.note, "interior-manufacturer", true)}
            </div>
            <div class="actions" style="margin-top: 16px;">
              <button class="button" data-action="new-interior-manufacturer">${icon("plus")}Új</button>
              <button class="button primary" data-action="save-interior-manufacturer">${icon("save")}Mentés</button>
            </div>
            <p class="panel-note" style="margin-top: 10px;">Standard méreteket így adj meg: 750x2100,900x2100,1000x2100.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Beltéri gyártók</h2>
              <p class="panel-note">${catalog.manufacturers.length} mentett gyártó.</p>
            </div>
          </div>
          <div class="panel-body list-grid">
            ${catalog.manufacturers.map((manufacturer) => `
              <div class="data-card ${selectedManufacturer?.id === manufacturer.id ? "selected" : ""}">
                <div class="data-card-title">
                  <span>${esc(manufacturer.name)}</span>
                  <span class="tag teal">${manufacturer.sizing === "standard" ? "Standard méret" : "Egyedi méret"}</span>
                </div>
                <div class="data-card-meta">${esc(manufacturer.sizesText || "Nincs méretkorlát")} · ${esc(manufacturer.note || "")}</div>
                <div class="actions" style="justify-content: flex-start;">
                  <button class="button" data-action="select-interior-manufacturer" data-id="${manufacturer.id}">${icon("edit")}Kiválaszt</button>
                  <button class="button danger" data-action="delete-interior-manufacturer" data-id="${manufacturer.id}">${icon("trash")}Törlés</button>
                </div>
              </div>
            `).join("")}
          </div>
        </section>
      </div>

      <div class="manage-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">${ui.interiorModelDraft.id ? "Ajtómodell szerkesztése" : "Új ajtómodell"}</h2>
              <p class="panel-note">Egy modellen belül külön Dekor és CPL alapár adható meg.</p>
            </div>
          </div>
          <div class="panel-body">
            <div class="form-grid">
              <div class="field full">
                <label>Gyártó</label>
                <select data-bind-interior-model="manufacturerId">
                  ${catalog.manufacturers.map((item) => `<option value="${item.id}" ${item.id === ui.interiorModelDraft.manufacturerId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
                </select>
              </div>
              ${field("Modell neve", "name", ui.interiorModelDraft.name, "interior-model")}
              ${field("Dekor ár", "decorPrice", ui.interiorModelDraft.decorPrice, "interior-model", false, "number")}
              ${field("CPL ár", "cplPrice", ui.interiorModelDraft.cplPrice, "interior-model", false, "number")}
              <div class="field full">
                <span class="field-label">Egyedi tok árazás</span>
                <label class="check" style="width: max-content;">
                  <input type="checkbox" data-bool-interior-model="customFrameEnabled" ${ui.interiorModelDraft.customFrameEnabled ? "checked" : ""} />
                  Ennél a modellnél lehet centiméteres egyedi tok felár
                </label>
              </div>
              ${field("Dekor alapáras tok cm-ig", "decorIncludedFrameCm", ui.interiorModelDraft.decorIncludedFrameCm, "interior-model", false, "number")}
              ${field("CPL alapáras tok cm-ig", "cplIncludedFrameCm", ui.interiorModelDraft.cplIncludedFrameCm, "interior-model", false, "number")}
              ${field("Felár Ft / extra cm", "customFrameSurchargePerCm", ui.interiorModelDraft.customFrameSurchargePerCm, "interior-model", false, "number")}
              ${field("Megjegyzés", "note", ui.interiorModelDraft.note, "interior-model", true)}
            </div>
            <div class="actions" style="margin-top: 16px;">
              <button class="button" data-action="new-interior-model">${icon("plus")}Új</button>
              <button class="button primary" data-action="save-interior-model">${icon("save")}Mentés</button>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Modellek</h2>
              <p class="panel-note">${esc(selectedManufacturer?.name || "")} modelljei.</p>
            </div>
          </div>
          <div class="panel-body list-grid">
            ${visibleModels.map((model) => `
              <div class="data-card ${ui.interiorModelDraft.id === model.id ? "selected" : ""}">
                <div class="data-card-title">
                  <span>${esc(model.name)}</span>
                  <span class="tag amber">Dekor ${money(model.decorPrice)} · CPL ${money(model.cplPrice)}</span>
                </div>
                <div class="data-card-meta">${esc(model.note || "Nincs megjegyzés")}</div>
                <div class="actions" style="justify-content: flex-start;">
                  <button class="button" data-action="edit-interior-model" data-id="${model.id}">${icon("edit")}Szerkesztés</button>
                  <button class="button danger" data-action="delete-interior-model" data-id="${model.id}">${icon("trash")}Törlés</button>
                </div>
              </div>
            `).join("") || `<div class="empty">Ehhez a gyártóhoz még nincs ajtómodell.</div>`}
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Modell-szín képek</h2>
            <p class="panel-note">Az adott modell adott színéhez feltöltött kép jelenik meg a tétel előnézetében és PDF-ben.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="form-grid three">
            <div class="field">
              <label>Modell</label>
              <select data-ui="selectedInteriorModelId">
                ${catalog.models.map((model) => `<option value="${model.id}" ${model.id === imageModel?.id ? "selected" : ""}>${esc(interiorManufacturer(model.manufacturerId)?.name || "")} · ${esc(model.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Szín</label>
              <select data-ui="selectedInteriorImageColorId">
                ${catalog.colors.map((color) => `<option value="${color.id}" ${color.id === imageColor?.id ? "selected" : ""}>${esc(color.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Kép fájl</label>
              <input type="file" accept="image/*" data-action="upload-interior-image" />
            </div>
          </div>
          <div class="actions" style="justify-content: flex-start; margin-top: 12px;">
            <button class="button danger" data-action="remove-interior-image">${icon("trash")}Kép törlése</button>
          </div>
          <div class="drawing-stage" style="min-height: 230px; margin-top: 14px;">
            ${image ? `<img class="preview-image" src="${image}" alt="${esc(imageModel?.name || "Beltéri ajtó kép")}" />` : renderOpeningSvg("door", 900, 2100)}
          </div>
        </div>
      </section>

      <div class="split">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Beltéri színek</h2>
              <p class="panel-note">A színek egy árkategóriába tartoznak, itt a megnevezések kezelhetők.</p>
            </div>
            <button class="button" data-action="add-interior-color">${icon("plus")}Új szín</button>
          </div>
          ${editableInteriorTable("colors", catalog.colors, [["name", "Szín"]])}
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Tokvastagságok</h2>
              <p class="panel-note">Tokvastagság felára tételenként.</p>
            </div>
            <button class="button" data-action="add-interior-frame">${icon("plus")}Új tok</button>
          </div>
          ${editableInteriorTable("frames", catalog.frames, [["name", "Tokvastagság"], ["price", "Felár"]])}
        </section>
      </div>

      <div class="split">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Kilincsek</h2>
              <p class="panel-note">Kilincs felára tételenként.</p>
            </div>
            <button class="button" data-action="add-interior-handle">${icon("plus")}Új kilincs</button>
          </div>
          ${editableInteriorTable("handles", catalog.handles, [["name", "Kilincs"], ["price", "Felár"]])}
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Zár típusok</h2>
              <p class="panel-note">Normál BB, WC és biztonsági zár árak.</p>
            </div>
            <button class="button" data-action="add-interior-lock">${icon("plus")}Új zár</button>
          </div>
          ${editableInteriorTable("locks", catalog.locks, [["name", "Zár"], ["price", "Felár"]])}
        </section>
      </div>
    </div>
  `;
}

function renderMatricesView() {
  const profile = getProfile(ui.selectedMatrixProfileId) || state.catalog.profiles[0];
  const opening = exteriorOpeningTypes().find((item) => item.id === ui.selectedMatrixProductType) || exteriorOpeningTypes()[0];
  ui.selectedMatrixProductType = opening.id;
  const key = matrixKey(profile.id, opening.id);
  const matrix = state.catalog.matrices[key] || createMatrix(profile, matrixTypeForOpening(opening));
  state.catalog.matrices[key] = matrix;
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">100 mm-es ármátrix</h2>
          <p class="panel-note">A kalkulátor felfelé kerekít a következő 100 mm-es cellára. A „Tilt” jelölés nem gyártható méretet jelent.</p>
        </div>
      </div>
      <div class="panel-body matrix-layout">
        <div class="matrix-toolbar">
          <div class="field">
            <label>Profil</label>
            <select data-ui="selectedMatrixProfileId">
              ${state.catalog.profiles.map((item) => `<option value="${item.id}" ${item.id === profile.id ? "selected" : ""}>${esc(item.manufacturer)} · ${esc(item.name)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Nyílászáró típus</label>
            <select data-ui="selectedMatrixProductType">
              ${exteriorOpeningTypes().map((item) => `<option value="${item.id}" ${item.id === opening.id ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
            </select>
          </div>
          <button class="button" data-action="save-matrix">${icon("save")}Mentés</button>
        </div>

        <div class="table-wrap">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>Mag. \\ Szél.</th>
                ${matrix.widths.map((width) => `<th class="numeric">${width}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${matrix.heights.map((height) => `
                <tr>
                  <td>${height}</td>
                  ${matrix.widths.map((width) => {
                    const key = `${width}x${height}`;
                    const blocked = Boolean(matrix.blocked?.[key]);
                    return `
                      <td class="${blocked ? "matrix-blocked" : ""}">
                        <div class="matrix-cell">
                          <input type="number" min="0" step="100" data-matrix-cell="${key}" value="${esc(matrix.prices[key] || 0)}" ${blocked ? "disabled" : ""} />
                          <label title="Nem gyártható méret"><input type="checkbox" data-matrix-blocked="${key}" ${blocked ? "checked" : ""} /> Nem</label>
                        </div>
                      </td>
                    `;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="field">
          <label>CSV/TSV beillesztés</label>
          <textarea id="matrixPaste" placeholder="Első sor: szélességek, első oszlop: magasságok. Tabulátorral, pontosvesszővel vagy vesszővel elválasztva."></textarea>
        </div>
        <div class="actions" style="justify-content: flex-start;">
          <button class="button" data-action="import-matrix">${icon("upload")}Beillesztett mátrix importálása</button>
        </div>
      </div>
    </section>
  `;
}

function renderExtrasView() {
  return `
    <div class="workspace-main">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Szín felárak</h2>
            <p class="panel-note">Külön felár adható meg kívül színes és kívül-belül színes kivitelre.</p>
          </div>
          <button class="button" data-action="add-color">${icon("plus")}Új szín</button>
        </div>
        ${editableTable("colors", state.catalog.colors, [
          ["name", "Szín"],
          ["outsideValue", "Kívül színes %"],
          ["bothValue", "Kívül-belül színes %"]
        ])}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Üvegezés</h2>
            <p class="panel-note">UG érték és felár százalékban.</p>
          </div>
          <button class="button" data-action="add-glass">${icon("plus")}Új üveg</button>
        </div>
        ${editableTable("glasses", state.catalog.glasses, [
          ["name", "Megnevezés"],
          ["layers", "Réteg"],
          ["ug", "UG"],
          ["value", "Felár %"]
        ])}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Toktoldó árak</h2>
            <p class="panel-note">Folyóméter ár milliméteres méret szerint.</p>
          </div>
          <button class="button" data-action="add-extension">${icon("plus")}Új toktoldó</button>
        </div>
        ${editableTable("extensions", state.catalog.extensions, [
          ["mm", "Méret mm"],
          ["pricePerM", "Ft / fm"]
        ])}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Redőny és szúnyogháló</h2>
            <p class="panel-note">Egyszerű kiegészítő árazás szélességre, felületre vagy fix árra.</p>
          </div>
          <button class="button" data-action="add-accessory">${icon("plus")}Új kiegészítő</button>
        </div>
        ${editableTable("accessories", state.catalog.accessories.filter((item) => item.category !== "install"), [
          ["category", "Kategória"],
          ["name", "Megnevezés"],
          ["pricing", "Árazás"],
          ["price", "Ár"]
        ])}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Beépítési tételek</h2>
            <p class="panel-note">Ablak, ajtó, redőny és szúnyogháló beépítési díjak külön választhatók az ajánlati tételnél.</p>
          </div>
          <button class="button" data-action="add-install-accessory">${icon("plus")}Új beépítés</button>
        </div>
        ${editableTable("accessories", accessoriesBy("install"), [
          ["name", "Megnevezés"],
          ["pricing", "Árazás"],
          ["price", "Ár"]
        ])}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Nyitáskép feltöltés</h2>
            <p class="panel-note">Ha feltöltesz képet egy típushoz, az kerül a PDF-be az SVG rajz helyett.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="form-grid three">
            <div class="field">
              <label>Nyitáskép típus</label>
              <select data-ui="selectedOpeningImageId">
                ${exteriorOpeningTypes().map((item) => `<option value="${item.id}" ${item.id === ui.selectedOpeningImageId ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label>Kép fájl</label>
              <input type="file" accept="image/*" data-action="upload-opening-image" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button class="button danger" data-action="remove-opening-image">${icon("trash")}Kép törlése</button>
            </div>
          </div>
          <div class="drawing-stage" style="min-height: 210px; margin-top: 14px;">
            ${state.openingImages[ui.selectedOpeningImageId] ? `<img class="preview-image" src="${state.openingImages[ui.selectedOpeningImageId]}" alt="Feltöltött nyitáskép" />` : renderOpeningSvg(ui.selectedOpeningImageId, 1200, 1500)}
          </div>
        </div>
      </section>
    </div>
  `;
}

function editableTable(collection, rows, fields) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${fields.map(([, label]) => `<th>${esc(label)}</th>`).join("")}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${fields.map(([fieldName]) => `
                <td>
                  <input
                    value="${esc(row[fieldName])}"
                    data-edit-collection="${collection}"
                    data-edit-id="${row.id}"
                    data-edit-field="${fieldName}"
                    style="width: 100%; min-height: 34px; border: 1px solid var(--line-strong); border-radius: 8px; padding: 6px 8px;"
                  />
                </td>
              `).join("")}
              <td class="numeric">
                <button class="button danger icon-only" title="Törlés" data-action="delete-catalog-row" data-collection="${collection}" data-id="${row.id}">${icon("trash")}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function editableInteriorTable(collection, rows, fields) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${fields.map(([, label]) => `<th>${esc(label)}</th>`).join("")}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${fields.map(([fieldName]) => `
                <td>
                  <input
                    value="${esc(row[fieldName])}"
                    data-edit-interior-collection="${collection}"
                    data-edit-id="${row.id}"
                    data-edit-field="${fieldName}"
                    style="width: 100%; min-height: 34px; border: 1px solid var(--line-strong); border-radius: 8px; padding: 6px 8px;"
                  />
                </td>
              `).join("")}
              <td class="numeric">
                <button class="button danger icon-only" title="Törlés" data-action="delete-interior-row" data-collection="${collection}" data-id="${row.id}">${icon("trash")}</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSettingsView() {
  return `
    <div class="manage-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Cégadatok és alapárak</h2>
            <p class="panel-note">Ezek jelennek meg az ügyfél PDF fejlécében.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="form-grid">
            ${field("Cégnév", "companyName", state.settings.companyName, "settings")}
            ${field("Cím", "companyAddress", state.settings.companyAddress, "settings")}
            ${field("Telefon", "companyPhone", state.settings.companyPhone, "settings")}
            ${field("Email", "companyEmail", state.settings.companyEmail, "settings")}
            ${field("Alap haszonkulcs %", "defaultMargin", state.settings.defaultMargin, "settings", false, "number")}
            ${field("ÁFA %", "vat", state.settings.vat, "settings", false, "number")}
            ${field("Érvényesség nap", "validityDays", state.settings.validityDays, "settings", false, "number")}
            ${field("Alap gyártási határidő", "defaultProductionDeadline", state.settings.defaultProductionDeadline, "settings")}
            ${field("PDF megjegyzés", "paymentNote", state.settings.paymentNote, "settings", true)}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Adatmentés</h2>
            <p class="panel-note">A teljes helyi adatbázis JSON fájlba menthető és visszatölthető.</p>
          </div>
        </div>
        <div class="panel-body">
          <div class="actions" style="justify-content: flex-start;">
            <button class="button primary" data-action="export-backup">${icon("download")}Biztonsági mentés letöltése</button>
            <label class="button">
              ${icon("upload")}Mentés visszatöltése
              <input type="file" accept="application/json" data-action="import-backup" style="display:none;" />
            </label>
          </div>
          <p class="panel-note" style="margin-top: 14px;">Javaslat: komoly használat előtt ezt a prototípust érdemes SQLite-alapú Windows appként csomagolni, hogy több kolléga gépén is biztonságosabb legyen a mentés.</p>
        </div>
      </section>
    </div>
  `;
}

function field(label, key, value, scope, textarea = false, type = "text") {
  const bind = scope === "settings" ? `data-bind-settings="${key}"` : `data-bind-${scope}="${key}"`;
  return `
    <div class="field ${textarea ? "full" : ""}">
      <label>${esc(label)}</label>
      ${textarea
        ? `<textarea ${bind}>${esc(value)}</textarea>`
        : `<input type="${type}" ${bind} value="${esc(value)}" />`}
    </div>
  `;
}

function selectField(label, key, value, scope, options) {
  return `
    <div class="field">
      <label>${esc(label)}</label>
      <select data-bind-${scope}="${key}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
      </select>
    </div>
  `;
}

function renderPrintSheet(quote) {
  if (!quote) return "";
  const customer = getCustomer(quote.customerId);
  const totals = calcQuote(quote);
  const validUntil = addDays(quote.createdAt, Number(state.settings.validityDays || 15));
  const internalPrint = ui.printMode === "internal";
  return `
    <article class="print-sheet ${internalPrint ? "print-internal-sheet" : "print-customer-sheet"}">
      <header class="print-header">
        <div>
          <h1 class="print-title">${internalPrint ? "Belső árajánlat" : "Árajánlat"}</h1>
          <p><strong>${esc(quote.number)}</strong><br />Kelt: ${esc(quote.createdAt)} · Érvényes: ${esc(validUntil)}</p>
        </div>
        <div>
          <strong>${esc(state.settings.companyName)}</strong><br />
          ${esc(state.settings.companyAddress)}<br />
          ${esc(state.settings.companyPhone)}<br />
          ${esc(state.settings.companyEmail)}
        </div>
      </header>

      <section class="print-section print-grid">
        <div>
          <h2>Ügyfél</h2>
          <p><strong>${esc(customer?.name || "")}</strong><br />${esc(customer?.address || "")}<br />${esc(customer?.phone || "")}<br />${esc(customer?.email || "")}</p>
        </div>
        <div>
          <h2>Projekt</h2>
          <p>${esc(quote.projectAddress || customer?.address || "")}<br />Gyártási határidő: ${esc(quote.productionDeadline || state.settings.defaultProductionDeadline || "-")}<br />${esc(quote.note || "")}</p>
        </div>
      </section>

      <section class="print-section">
        <h2>Tételek</h2>
        ${quote.items.map((item, index) => {
          const calc = calcItem(item, quote);
          const profile = getProfile(item.profileId);
          const image = item.productTypeId === "interior-door" ? getInteriorDoorImage(item) : state.openingImages?.[item.openingTypeId];
          return `
            <div class="print-item">
              <div>${image ? `<img src="${image}" alt="${esc(itemTitle(item))}" />` : renderOpeningSvg(item.openingTypeId, item.width, item.height, true)}</div>
              <div>
                <strong>${index + 1}. ${esc(itemTitle(item))}</strong><br />
                ${item.productTypeId === "interior-door" ? esc(interiorPrintDetails(item)) : `${esc(profile?.manufacturer || "")} · ${esc(profile?.name || "")}`}<br />
                Méret: ${number(item.width)} x ${number(item.height)} mm · Mennyiség: ${number(item.quantity)} db<br />
                ${item.productTypeId === "interior-door"
                  ? `${esc(interiorPrintOptions(item))}<br />`
                  : `Szín: ${esc(colorName(item.colorId))} (${esc(colorModeName(item.colorMode))}) · Üvegezés: ${esc(glassName(item.glassId))} · ${esc(formatThermalInfo(item))}<br />`}
                ${item.productTypeId !== "interior-door" && item.extensionMm ? `Toktoldó: ${esc(item.extensionMm)} mm, ${esc(item.extensionPlacement)}<br />` : ""}
                ${accessoryLine(item, quote, calc)}
                <span class="internal-only">Beszerzés: ${money(calc.cost)} · Fedezet: ${money(calc.net - calc.cost)}<br /></span>
                <strong>Nettó ár: ${money(calc.net)}</strong>
              </div>
            </div>
          `;
        }).join("")}
        <div class="print-total" style="display: grid; gap: 6px; justify-content: end;">
          <div class="internal-only">Beszerzés összesen: ${money(totals.cost)}</div>
          <div class="internal-only">Haszonkulcs: ${number(quote.margin ?? state.settings.defaultMargin)}%</div>
          <div class="internal-only">Fedezet összesen: ${money(totals.net - totals.cost)}</div>
          <div>Nettó összesen: ${money(totals.net)}</div>
          <div>ÁFA ${esc(vatLabel(quote))}: ${money(totals.vatAmount)}</div>
          <div>Fizetendő bruttó: ${money(totals.gross)}</div>
        </div>
        <p>${esc(state.settings.paymentNote)}</p>
      </section>
    </article>
  `;
}

function handleClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    ui.view = viewButton.dataset.view;
    render();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;
  const id = actionButton.dataset.id;
  const collection = actionButton.dataset.collection;

  if (action === "select-quote") selectQuote(id);
  if (action === "new-quote") newQuote();
  if (action === "duplicate-quote") duplicateQuote();
  if (action === "print-quote") printQuote(ui.selectedQuoteId, actionButton.dataset.printMode || "customer");
  if (action === "dashboard-print-quote") printQuote(id, actionButton.dataset.printMode || "customer");
  if (action === "open-dashboard") openDashboard();
  if (action === "set-quote-status") setQuoteStatus(id || ui.selectedQuoteId, actionButton.dataset.status);
  if (action === "delete-quote") deleteQuote(id);
  if (action === "save-item") saveItem();
  if (action === "clear-item") clearItem();
  if (action === "select-item") selectItem(id);
  if (action === "delete-item") deleteSelectedItem();
  if (action === "new-customer") newCustomer();
  if (action === "save-customer") saveCustomer();
  if (action === "edit-customer") editCustomer(id);
  if (action === "delete-customer") deleteCustomer(id);
  if (action === "new-profile") newProfile();
  if (action === "save-profile") saveProfile();
  if (action === "edit-profile") editProfile(id);
  if (action === "delete-profile") deleteProfile(id);
  if (action === "new-interior-manufacturer") newInteriorManufacturer();
  if (action === "save-interior-manufacturer") saveInteriorManufacturer();
  if (action === "select-interior-manufacturer") selectInteriorManufacturer(id);
  if (action === "delete-interior-manufacturer") deleteInteriorManufacturer(id);
  if (action === "new-interior-model") newInteriorModel();
  if (action === "save-interior-model") saveInteriorModel();
  if (action === "edit-interior-model") editInteriorModel(id);
  if (action === "delete-interior-model") deleteInteriorModel(id);
  if (action === "save-matrix") {
    saveState();
    showToast("Ármátrix mentve.");
  }
  if (action === "fill-matrix") fillSelectedMatrix();
  if (action === "import-matrix") importMatrix();
  if (action === "add-color") addCatalogRow("colors");
  if (action === "add-glass") addCatalogRow("glasses");
  if (action === "add-extension") addCatalogRow("extensions");
  if (action === "add-accessory") addCatalogRow("accessories");
  if (action === "add-install-accessory") addCatalogRow("installAccessories");
  if (action === "add-exterior-opening") addCatalogRow("exteriorOpenings");
  if (action === "delete-catalog-row") deleteCatalogRow(collection, id);
  if (action === "add-interior-color") addInteriorRow("colors");
  if (action === "add-interior-frame") addInteriorRow("frames");
  if (action === "add-interior-handle") addInteriorRow("handles");
  if (action === "add-interior-lock") addInteriorRow("locks");
  if (action === "delete-interior-row") deleteInteriorRow(collection, id);
  if (action === "remove-opening-image") removeOpeningImage();
  if (action === "remove-interior-image") removeInteriorImage();
  if (action === "export-backup") exportBackup();
}

function handleInput(event) {
  const target = event.target;
  if (target.dataset.bindItem) {
    updateItemDraft(target.dataset.bindItem, target.value);
    saveState();
    render();
    return;
  }
  if (target.dataset.matrixBlocked) {
    const matrix = getSelectedMatrix();
    matrix.blocked = matrix.blocked || {};
    matrix.blocked[target.dataset.matrixBlocked] = target.checked;
    saveState();
    render();
    return;
  }
  if (target.dataset.boolItem) {
    ui.itemDraft[target.dataset.boolItem] = target.checked;
    saveState();
    render();
    return;
  }
  if (target.dataset.side) {
    ui.itemDraft.extensionSides[target.dataset.side] = target.checked;
    saveState();
    render();
    return;
  }
  if (target.dataset.bindQuote) {
    const quote = getSelectedQuote();
    if (!quote) return;
    quote[target.dataset.bindQuote] = coerceField(target.dataset.bindQuote, target.value);
    touchQuote(quote);
    persistQuote(quote).catch((error) => {
      console.warn("Nem sikerült menteni az ajánlatot.", error);
      saveState();
    });
    render();
    return;
  }
  if (target.dataset.dashboardSearch !== undefined) {
    ui.quoteSearch = target.value;
    render();
    return;
  }
  if (target.dataset.dashboardCreatedFrom !== undefined) {
    ui.quoteCreatedFrom = target.value;
    render();
    return;
  }
  if (target.dataset.dashboardDeadline !== undefined) {
    ui.quoteDeadlineFilter = target.value;
    render();
    return;
  }
  if (target.dataset.bindCustomer) {
    ui.customerDraft[target.dataset.bindCustomer] = target.value;
    return;
  }
  if (target.dataset.bindProfile) {
    ui.profileDraft[target.dataset.bindProfile] = target.value;
    return;
  }
  if (target.dataset.bindInteriorManufacturer) {
    ui.interiorManufacturerDraft[target.dataset.bindInteriorManufacturer] = target.value;
    return;
  }
  if (target.dataset.bindInteriorModel) {
    ui.interiorModelDraft[target.dataset.bindInteriorModel] = coerceField(target.dataset.bindInteriorModel, target.value);
    return;
  }
  if (target.dataset.boolInteriorModel) {
    ui.interiorModelDraft[target.dataset.boolInteriorModel] = target.checked;
    return;
  }
  if (target.dataset.bindSettings) {
    state.settings[target.dataset.bindSettings] = coerceField(target.dataset.bindSettings, target.value);
    saveState();
    return;
  }
  if (target.dataset.matrixCell) {
    const matrix = getSelectedMatrix();
    matrix.prices[target.dataset.matrixCell] = Number(target.value || 0);
    saveState();
    return;
  }
  if (target.dataset.editCollection) {
    const row = state.catalog[target.dataset.editCollection].find((item) => item.id === target.dataset.editId);
    if (row) {
      row[target.dataset.editField] = coerceField(target.dataset.editField, target.value);
      saveState();
    }
  }
  if (target.dataset.editInteriorCollection) {
    const row = state.catalog.interiorDoors[target.dataset.editInteriorCollection].find((item) => item.id === target.dataset.editId);
    if (row) {
      row[target.dataset.editField] = coerceField(target.dataset.editField, target.value);
      saveState();
    }
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.dataset.dashboardStatus !== undefined) {
    ui.quoteStatusFilter = target.value;
    render();
    return;
  }
  if (target.dataset.dashboardCustomer !== undefined) {
    ui.quoteCustomerFilter = target.value;
    render();
    return;
  }
  if (target.dataset.bindItem) {
    updateItemDraft(target.dataset.bindItem, target.value);
    saveState();
    render();
    return;
  }
  if (target.dataset.bindInteriorManufacturer) {
    ui.interiorManufacturerDraft[target.dataset.bindInteriorManufacturer] = target.value;
    return;
  }
  if (target.dataset.bindInteriorModel) {
    ui.interiorModelDraft[target.dataset.bindInteriorModel] = coerceField(target.dataset.bindInteriorModel, target.value);
    return;
  }
  if (target.dataset.ui) {
    ui[target.dataset.ui] = target.value;
    render();
    return;
  }
  if (target.dataset.action === "upload-opening-image" && target.files?.[0]) {
    uploadOpeningImage(target.files[0]);
    return;
  }
  if (target.dataset.action === "upload-interior-image" && target.files?.[0]) {
    uploadInteriorImage(target.files[0]);
    return;
  }
  if (target.dataset.action === "import-backup" && target.files?.[0]) {
    importBackup(target.files[0]);
  }
}

function coerceField(key, value) {
  if (["width", "height", "quantity", "margin", "defaultMargin", "validityDays", "uf", "ug2", "ug3", "layers", "ug", "value", "outsideValue", "bothValue", "mm", "pricePerM", "price", "decorPrice", "cplPrice", "decorIncludedFrameCm", "cplIncludedFrameCm", "customFrameSurchargePerCm", "interiorFrameDepthCm"].includes(key)) {
    return value === "" ? "" : Number(value);
  }
  return value;
}

function updateItemDraft(key, value) {
  ui.itemDraft[key] = coerceField(key, value);
  if (key === "productTypeId") {
    if (value === "balcony") ui.itemDraft.openingTypeId = "balcony";
    if (value === "entrance-door") ui.itemDraft.openingTypeId = "entrance-door";
    if (value === "interior-door") ui.itemDraft.openingTypeId = "door";
    if (value === "interior-door") applyInteriorDefaultsToDraft();
  }
  if (key === "openingTypeId") {
    const opening = exteriorOpeningTypes().find((item) => item.id === value);
    if (opening?.productTypeId) ui.itemDraft.productTypeId = opening.productTypeId;
  }
  if (key === "interiorManufacturerId") applyInteriorDefaultsToDraft(value);
  if (key === "interiorSizeId") applyInteriorSizeToDraft(value);
}

function applyInteriorDefaultsToDraft(manufacturerId = ui.itemDraft.interiorManufacturerId) {
  const defaults = getInteriorDefaults(state, manufacturerId);
  ui.itemDraft.interiorManufacturerId = defaults.manufacturerId;
  ui.itemDraft.interiorModelId = interiorModelsForManufacturer(defaults.manufacturerId).some((model) => model.id === ui.itemDraft.interiorModelId)
    ? ui.itemDraft.interiorModelId
    : defaults.modelId;
  ui.itemDraft.interiorColorId = ui.itemDraft.interiorColorId || defaults.colorId;
  ui.itemDraft.interiorFrameId = ui.itemDraft.interiorFrameId || defaults.frameId;
  ui.itemDraft.interiorHandleId = ui.itemDraft.interiorHandleId || defaults.handleId;
  ui.itemDraft.interiorLockId = ui.itemDraft.interiorLockId || defaults.lockId;
  ui.itemDraft.interiorSizeId = defaults.sizeId;
  applyInteriorSizeToDraft(defaults.sizeId);
}

function applyInteriorSizeToDraft(sizeId) {
  const manufacturer = interiorManufacturer(ui.itemDraft.interiorManufacturerId);
  const size = parseInteriorSizes(manufacturer?.sizesText || "").find((item) => item.id === sizeId);
  if (!size) return;
  ui.itemDraft.width = size.width;
  ui.itemDraft.height = size.height;
}

function selectQuote(id) {
  ui.selectedQuoteId = id;
  ui.view = "quote-editor";
  ui.selectedItemId = "";
  ui.itemDraft = createDefaultItem(state);
  render();
}

function openDashboard() {
  ui.view = "quotes";
  ui.selectedItemId = "";
  render();
}

async function newQuote() {
  const id = uid("quote");
  const today = todayIso();
  const quote = {
    id,
    number: nextQuoteNumber(),
    customerId: state.customers[0]?.id || "",
    projectAddress: state.customers[0]?.address || "",
    status: "Vázlat",
    createdAt: today,
    updatedAt: today,
    version: 1,
    statusHistory: [{ status: "Vázlat", at: today, note: "Létrehozva" }],
    productionDeadline: state.settings.defaultProductionDeadline || "6-8 hét",
    margin: Number(state.settings.defaultMargin || 0),
    vat: Number(state.settings.vat || 0),
    note: "",
    items: []
  };
  state.quotes.unshift(quote);
  ui.selectedQuoteId = id;
  ui.view = "quote-editor";
  ui.selectedItemId = "";
  ui.itemDraft = createDefaultItem(state);
  await persistQuote(quote);
  render();
  showToast("Új ajánlat létrehozva.");
}

function nextQuoteNumber() {
  const next = state.quotes.length + 1;
  return `AJ-${new Date().getFullYear()}-${String(next).padStart(4, "0")}`;
}

async function duplicateQuote() {
  const quote = getSelectedQuote();
  if (!quote) return;
  const copy = clone(quote);
  copy.id = uid("quote");
  copy.number = nextQuoteNumber();
  copy.createdAt = todayIso();
  copy.updatedAt = copy.createdAt;
  copy.version = 1;
  copy.status = "Vázlat";
  copy.statusHistory = [{ status: "Vázlat", at: copy.createdAt, note: "Másolatként létrehozva" }];
  copy.items = copy.items.map((item) => ({ ...item, id: uid("item") }));
  state.quotes.unshift(copy);
  ui.selectedQuoteId = copy.id;
  ui.view = "quote-editor";
  await persistQuote(copy);
  render();
  showToast("Ajánlat másolva.");
}

async function setQuoteStatus(id, status) {
  const quote = state.quotes.find((item) => item.id === id);
  if (!quote || !status) return;
  if (quote.status === status) return;
  quote.status = status;
  quote.statusHistory = quote.statusHistory || [];
  quote.statusHistory.push({ status, at: todayIso(), note: "Státuszváltás" });
  touchQuote(quote);
  await persistQuote(quote);
  render();
  showToast(`Ajánlat státusza: ${status}.`);
}

function touchQuote(quote) {
  quote.updatedAt = todayIso();
  quote.version = Number(quote.version || 1) + 1;
}

async function deleteQuote(id) {
  const index = state.quotes.findIndex((quote) => quote.id === id);
  if (index < 0) return;
  const [removed] = state.quotes.splice(index, 1);
  if (ui.selectedQuoteId === removed.id) ui.selectedQuoteId = state.quotes[0]?.id || "";
  ui.view = "quotes";
  await persistQuoteDelete(id);
  render();
  showToast("Ajánlat törölve.");
}

async function printQuote(id, mode = "customer") {
  if (id) ui.selectedQuoteId = id;
  ui.printMode = mode === "internal" ? "internal" : "customer";
  render();
  document.body.classList.toggle("print-internal", ui.printMode === "internal");
  document.body.classList.toggle("print-customer", ui.printMode !== "internal");
  await waitForPrintRender();
  const quote = getSelectedQuote();
  const pdfApi = window.nyilaszaroApp?.pdf;
  if (quote && pdfApi?.exportQuote) {
    try {
      const result = await pdfApi.exportQuote({ quoteNumber: quote.number, mode: ui.printMode });
      clearPrintMode();
      if (result?.ok) showToast(`PDF mentve: ${result.path}`);
      else if (result?.canceled) showToast("PDF mentés megszakítva.");
      else showToast("Nem sikerült PDF-et készíteni.");
    } catch (error) {
      console.warn("Nem sikerült PDF-et készíteni.", error);
      clearPrintMode();
      showToast("Nem sikerült PDF-et készíteni.");
    }
    return;
  }
  window.setTimeout(() => window.print(), 0);
}

function clearPrintMode() {
  document.body.classList.remove("print-internal", "print-customer");
  ui.printMode = "customer";
}

function waitForPrintRender() {
  return new Promise((resolve) => {
    const raf = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 0));
    raf(() => raf(resolve));
  });
}

async function saveItem() {
  const quote = getSelectedQuote();
  if (!quote) return;
  const item = normalizeItem(ui.itemDraft);
  if (calcItem(item, quote).blocked) {
    showToast("Ez a méret nem gyárthatóként van jelölve az ármátrixban, ezért nem mentettem a tételt.");
    return;
  }
  if (ui.selectedItemId) {
    const index = quote.items.findIndex((row) => row.id === ui.selectedItemId);
    if (index >= 0) quote.items[index] = { ...item, id: ui.selectedItemId };
  } else {
    item.id = uid("item");
    quote.items.push(item);
    ui.selectedItemId = item.id;
  }
  ui.itemDraft = normalizeItem(quote.items.find((row) => row.id === ui.selectedItemId));
  await persistQuote(quote);
  render();
  showToast("Tétel mentve.");
}

function normalizeItem(item) {
  const normalized = {
    ...createDefaultItem(state),
    ...clone(item),
    width: Number(item.width || 0),
    height: Number(item.height || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    colorMode: item.colorMode || "outside",
    interiorCustomFrame: Boolean(item.interiorCustomFrame),
    interiorFrameDepthCm: Number(item.interiorFrameDepthCm || 12),
    extensionSides: {
      left: Boolean(item.extensionSides?.left),
      right: Boolean(item.extensionSides?.right),
      top: Boolean(item.extensionSides?.top),
      bottom: Boolean(item.extensionSides?.bottom)
    }
  };
  if (normalized.productTypeId === "interior-door") {
    const defaults = getInteriorDefaults(state, normalized.interiorManufacturerId);
    normalized.interiorManufacturerId = normalized.interiorManufacturerId || defaults.manufacturerId;
    normalized.interiorModelId = normalized.interiorModelId || defaults.modelId;
    normalized.interiorColorId = normalized.interiorColorId || defaults.colorId;
    normalized.interiorFrameId = normalized.interiorFrameId || defaults.frameId;
    normalized.interiorHandleId = normalized.interiorHandleId || defaults.handleId;
    normalized.interiorLockId = normalized.interiorLockId || defaults.lockId;
    normalized.interiorFinish = normalized.interiorFinish || "decor";
    const manufacturer = interiorManufacturer(normalized.interiorManufacturerId);
    if (manufacturer?.sizing === "standard") {
      normalized.interiorSizeId = normalized.interiorSizeId || defaults.sizeId;
      const size = parseInteriorSizes(manufacturer.sizesText).find((row) => row.id === normalized.interiorSizeId) || parseInteriorSizes(manufacturer.sizesText)[0];
      if (size) {
        normalized.width = size.width;
        normalized.height = size.height;
      }
    }
  }
  return normalized;
}

function clearItem() {
  ui.selectedItemId = "";
  ui.itemDraft = createDefaultItem(state);
  render();
}

function selectItem(id) {
  const quote = getSelectedQuote();
  const item = quote?.items.find((row) => row.id === id);
  if (!item) return;
  ui.selectedItemId = id;
  ui.itemDraft = normalizeItem(item);
  render();
}

async function deleteSelectedItem() {
  const quote = getSelectedQuote();
  if (!quote || !ui.selectedItemId) return;
  quote.items = quote.items.filter((item) => item.id !== ui.selectedItemId);
  ui.selectedItemId = "";
  ui.itemDraft = createDefaultItem(state);
  await persistQuote(quote);
  render();
  showToast("Tétel törölve.");
}

function newCustomer() {
  ui.customerDraft = createCustomerDraft();
  ui.view = "customers";
  render();
}

async function saveCustomer() {
  const draft = { ...ui.customerDraft };
  if (!draft.name.trim()) {
    showToast("Az ügyfél neve kötelező.");
    return;
  }
  if (draft.id) {
    const index = state.customers.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.customers[index] = draft;
  } else {
    draft.id = uid("customer");
    state.customers.push(draft);
    ui.customerDraft = createCustomerDraft(draft);
  }
  await persistCustomer(draft);
  render();
  showToast("Ügyfél mentve.");
}

function editCustomer(id) {
  const customer = getCustomer(id);
  if (!customer) return;
  ui.customerDraft = createCustomerDraft(customer);
  render();
}

async function deleteCustomer(id) {
  const used = state.quotes.some((quote) => quote.customerId === id);
  if (used) {
    showToast("Ez az ügyfél szerepel ajánlatban, ezért nem törölhető.");
    return;
  }
  state.customers = state.customers.filter((customer) => customer.id !== id);
  ui.customerDraft = createCustomerDraft();
  await persistCustomerDelete(id);
  render();
  showToast("Ügyfél törölve.");
}

function newProfile() {
  ui.profileDraft = createProfileDraft();
  ui.view = "profiles";
  render();
}

function saveProfile() {
  const draft = { ...ui.profileDraft };
  if (!draft.manufacturer.trim() || !draft.name.trim()) {
    showToast("A gyártó és profilnév kötelező.");
    return;
  }
  if (draft.id) {
    const index = state.catalog.profiles.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.catalog.profiles[index] = draft;
  } else {
    draft.id = uid("profile");
    state.catalog.profiles.push(draft);
    matrixProductTypes.forEach((type) => {
      state.catalog.matrices[matrixKey(draft.id, type.id)] = createMatrix(draft, type, state.catalog.profiles.length);
    });
    ui.profileDraft = createProfileDraft(draft);
  }
  saveState();
  showToast("Profil mentve.");
}

function editProfile(id) {
  const profile = getProfile(id);
  if (!profile) return;
  ui.profileDraft = createProfileDraft(profile);
  render();
}

function deleteProfile(id) {
  const used = state.quotes.some((quote) => quote.items.some((item) => item.profileId === id));
  if (used) {
    showToast("Ez a profil szerepel ajánlatban, ezért nem törölhető.");
    return;
  }
  state.catalog.profiles = state.catalog.profiles.filter((profile) => profile.id !== id);
  Object.keys(state.catalog.matrices).forEach((key) => {
    if (key.startsWith(`${id}__`)) delete state.catalog.matrices[key];
  });
  ui.profileDraft = createProfileDraft();
  ui.selectedMatrixProfileId = state.catalog.profiles[0]?.id || "";
  saveState();
  showToast("Profil törölve.");
}

function newInteriorManufacturer() {
  ui.interiorManufacturerDraft = createInteriorManufacturerDraft();
  ui.view = "interior";
  render();
}

function saveInteriorManufacturer() {
  const draft = { ...ui.interiorManufacturerDraft };
  if (!draft.name.trim()) {
    showToast("A beltéri gyártó neve kötelező.");
    return;
  }
  if (draft.id) {
    const index = state.catalog.interiorDoors.manufacturers.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.catalog.interiorDoors.manufacturers[index] = draft;
  } else {
    draft.id = uid("int-manufacturer");
    state.catalog.interiorDoors.manufacturers.push(draft);
  }
  ui.selectedInteriorManufacturerId = draft.id;
  ui.interiorManufacturerDraft = createInteriorManufacturerDraft(draft);
  saveState();
  showToast("Beltéri gyártó mentve.");
}

function selectInteriorManufacturer(id) {
  const manufacturer = interiorManufacturer(id);
  if (!manufacturer) return;
  ui.selectedInteriorManufacturerId = id;
  ui.interiorManufacturerDraft = createInteriorManufacturerDraft(manufacturer);
  const firstModel = interiorModelsForManufacturer(id)[0];
  ui.interiorModelDraft = createInteriorModelDraft(firstModel || { manufacturerId: id });
  render();
}

function deleteInteriorManufacturer(id) {
  const used = state.quotes.some((quote) => quote.items.some((item) => item.interiorManufacturerId === id));
  if (used) {
    showToast("Ez a beltéri gyártó szerepel ajánlatban, ezért nem törölhető.");
    return;
  }
  state.catalog.interiorDoors.manufacturers = state.catalog.interiorDoors.manufacturers.filter((item) => item.id !== id);
  state.catalog.interiorDoors.models = state.catalog.interiorDoors.models.filter((item) => item.manufacturerId !== id);
  ensureInteriorUiDefaults(true);
  saveState();
  render();
}

function newInteriorModel() {
  ui.interiorModelDraft = createInteriorModelDraft({ manufacturerId: ui.selectedInteriorManufacturerId || state.catalog.interiorDoors.manufacturers[0]?.id });
  ui.view = "interior";
  render();
}

function saveInteriorModel() {
  const draft = { ...ui.interiorModelDraft, images: ui.interiorModelDraft.images || {} };
  if (!draft.name.trim()) {
    showToast("Az ajtómodell neve kötelező.");
    return;
  }
  if (draft.id) {
    const index = state.catalog.interiorDoors.models.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.catalog.interiorDoors.models[index] = draft;
  } else {
    draft.id = uid("int-model");
    state.catalog.interiorDoors.models.push(draft);
  }
  ui.selectedInteriorManufacturerId = draft.manufacturerId;
  ui.selectedInteriorModelId = draft.id;
  ui.interiorModelDraft = createInteriorModelDraft(draft);
  saveState();
  showToast("Ajtómodell mentve.");
}

function editInteriorModel(id) {
  const model = interiorModel(id);
  if (!model) return;
  ui.selectedInteriorManufacturerId = model.manufacturerId;
  ui.selectedInteriorModelId = model.id;
  ui.interiorModelDraft = createInteriorModelDraft(model);
  render();
}

function deleteInteriorModel(id) {
  const used = state.quotes.some((quote) => quote.items.some((item) => item.interiorModelId === id));
  if (used) {
    showToast("Ez az ajtómodell szerepel ajánlatban, ezért nem törölhető.");
    return;
  }
  state.catalog.interiorDoors.models = state.catalog.interiorDoors.models.filter((item) => item.id !== id);
  ensureInteriorUiDefaults(true);
  saveState();
  render();
}

function addInteriorRow(collection) {
  const factories = {
    colors: () => ({ id: uid("int-color"), name: "Új beltéri szín" }),
    frames: () => ({ id: uid("int-frame"), name: "Új tokvastagság", price: 0 }),
    handles: () => ({ id: uid("int-handle"), name: "Új kilincs", price: 0 }),
    locks: () => ({ id: uid("int-lock"), name: "Új zár", price: 0 })
  };
  state.catalog.interiorDoors[collection].push(factories[collection]());
  saveState();
  render();
}

function deleteInteriorRow(collection, id) {
  state.catalog.interiorDoors[collection] = state.catalog.interiorDoors[collection].filter((item) => item.id !== id);
  saveState();
  render();
}

function ensureInteriorUiDefaults(force = false) {
  const catalog = state.catalog.interiorDoors;
  if (force || !interiorManufacturer(ui.selectedInteriorManufacturerId)) {
    ui.selectedInteriorManufacturerId = catalog.manufacturers[0]?.id || "";
  }
  const selectedModels = interiorModelsForManufacturer(ui.selectedInteriorManufacturerId);
  if (force || !interiorModel(ui.selectedInteriorModelId)) {
    ui.selectedInteriorModelId = selectedModels[0]?.id || catalog.models[0]?.id || "";
  }
  if (force || !interiorColor(ui.selectedInteriorImageColorId)) {
    ui.selectedInteriorImageColorId = catalog.colors[0]?.id || "";
  }
  if (force || !ui.interiorManufacturerDraft) {
    ui.interiorManufacturerDraft = createInteriorManufacturerDraft(interiorManufacturer(ui.selectedInteriorManufacturerId));
  }
  if (force || !ui.interiorModelDraft) {
    ui.interiorModelDraft = createInteriorModelDraft(interiorModel(ui.selectedInteriorModelId) || { manufacturerId: ui.selectedInteriorManufacturerId });
  }
}

function getSelectedMatrix() {
  const profile = getProfile(ui.selectedMatrixProfileId) || state.catalog.profiles[0];
  const opening = exteriorOpeningTypes().find((item) => item.id === ui.selectedMatrixProductType) || exteriorOpeningTypes()[0];
  const key = matrixKey(profile.id, opening.id);
  if (!state.catalog.matrices[key]) state.catalog.matrices[key] = createMatrix(profile, matrixTypeForOpening(opening));
  return state.catalog.matrices[key];
}

function fillSelectedMatrix() {
  const profile = getProfile(ui.selectedMatrixProfileId) || state.catalog.profiles[0];
  const opening = exteriorOpeningTypes().find((item) => item.id === ui.selectedMatrixProductType) || exteriorOpeningTypes()[0];
  state.catalog.matrices[matrixKey(profile.id, opening.id)] = createMatrix(profile, matrixTypeForOpening(opening), state.catalog.profiles.indexOf(profile));
  saveState();
  showToast("Mintaárak újratöltve a kiválasztott mátrixba.");
}

function importMatrix() {
  const matrix = getSelectedMatrix();
  const value = document.getElementById("matrixPaste")?.value || "";
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    showToast("Nincs beillesztett mátrix.");
    return;
  }
  const rows = lines.map((line) => line.split(/\t|;|,/).map((cell) => cell.trim()));
  const header = rows[0].slice(1).map(Number).filter(Boolean);
  const hasHeader = header.length > 0;
  if (hasHeader) {
    rows.slice(1).forEach((row) => {
      const height = Number(row[0]);
      row.slice(1).forEach((cell, index) => {
        const width = header[index];
        if (width && height) matrix.prices[`${width}x${height}`] = Number(cell.replace(/\s/g, "")) || 0;
      });
    });
  } else {
    rows.forEach((row, rowIndex) => {
      const height = matrix.heights[rowIndex];
      row.forEach((cell, colIndex) => {
        const width = matrix.widths[colIndex];
        if (width && height) matrix.prices[`${width}x${height}`] = Number(cell.replace(/\s/g, "")) || 0;
      });
    });
  }
  saveState();
  showToast("Mátrix importálva.");
}

function addCatalogRow(collection) {
  const factories = {
    colors: () => ({ id: uid("color"), name: "Új szín", type: "percent", outsideValue: 0, bothValue: 0 }),
    glasses: () => ({ id: uid("glass"), name: "Új üvegezés", layers: 2, ug: 1, type: "percent", value: 0 }),
    extensions: () => ({ id: uid("ext"), mm: 30, pricePerM: 0 }),
    accessories: () => ({ id: uid("acc"), category: "shutter", name: "Új kiegészítő", pricing: "fixed", price: 0 }),
    installAccessories: () => ({ id: uid("install"), category: "install", name: "Új beépítési tétel", pricing: "fixed", price: 0 }),
    exteriorOpenings: () => ({ id: uid("opening"), name: "Új nyílászáró típus", productTypeId: "window", note: "" })
  };
  if (collection === "installAccessories") state.catalog.accessories.push(factories[collection]());
  else state.catalog[collection].push(factories[collection]());
  saveState();
  render();
}

function deleteCatalogRow(collection, id) {
  state.catalog[collection] = state.catalog[collection].filter((item) => item.id !== id);
  saveState();
  render();
}

function uploadOpeningImage(file) {
  const reader = new FileReader();
  reader.onload = () => {
    state.openingImages[ui.selectedOpeningImageId] = reader.result;
    saveState();
    showToast("Nyitáskép feltöltve.");
  };
  reader.readAsDataURL(file);
}

function uploadInteriorImage(file) {
  const model = interiorModel(ui.selectedInteriorModelId);
  const color = interiorColor(ui.selectedInteriorImageColorId);
  if (!model || !color) {
    showToast("Válassz modellt és színt a képhez.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    model.images = model.images || {};
    model.images[color.id] = reader.result;
    saveState();
    showToast("Beltéri ajtó modell-szín kép feltöltve.");
  };
  reader.readAsDataURL(file);
}

function removeOpeningImage() {
  delete state.openingImages[ui.selectedOpeningImageId];
  saveState();
  showToast("Nyitáskép törölve.");
}

function removeInteriorImage() {
  const model = interiorModel(ui.selectedInteriorModelId);
  if (model?.images) delete model.images[ui.selectedInteriorImageColorId];
  saveState();
  showToast("Beltéri ajtó kép törölve.");
}

async function exportBackup() {
  const dataApi = window.nyilaszaroApp?.data;
  let backupState = state;
  if (dataApi?.exportState) {
    try {
      const result = await dataApi.exportState();
      if (result?.state) backupState = normalizeState(result.state, createSeedState());
    } catch (error) {
      console.warn("Nem sikerült SQLite-ból exportálni a mentést.", error);
    }
  }
  const blob = new Blob([JSON.stringify(backupState, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `nyilaszaro-ajanlatkeszito-mentes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const imported = JSON.parse(reader.result);
      const normalized = normalizeState(imported, createSeedState());
      const dataApi = window.nyilaszaroApp?.data;
      if (dataApi?.importState) {
        const result = await dataApi.importState(clone(normalized));
        if (syncStateFromMutation(result, { selectedQuoteId: result?.state?.quotes?.[0]?.id || "", view: ui.view })) {
          localStorage.setItem(DB_KEY, JSON.stringify(state));
        } else {
          state = normalized;
          resetUiAfterStateHydration();
          saveState();
        }
      } else {
        state = normalized;
        resetUiAfterStateHydration();
        saveState();
      }
      showToast("Biztonsági mentés visszatöltve.");
    } catch (error) {
      showToast("Nem olvasható a JSON mentés.");
    }
  };
  reader.readAsText(file);
}

function calcQuote(quote) {
  return pricing.summarizeQuote(quote.items.map((item) => calcItem(item, quote)));
}

function getVatRate(quote = getSelectedQuote()) {
  const value = quote?.vat ?? state.settings.vat ?? 0;
  return pricing.getVatRate(value);
}

function vatLabel(quote = getSelectedQuote()) {
  const value = quote?.vat ?? state.settings.vat ?? 0;
  return String(value).toUpperCase() === "FAD" ? "FAD" : `${number(value)}%`;
}

function calcItem(rawItem, quote = getSelectedQuote()) {
  const item = normalizeItem(rawItem);
  if (item.productTypeId === "interior-door") return calcInteriorDoorItem(item, quote);
  const matrix = getMatrixPrice(item.profileId, item.openingTypeId, item.width, item.height);
  if (matrix.blocked) {
    return blockedCalcResult(matrix, quote);
  }
  const base = matrix.price;
  const color = getCatalogItem("colors", item.colorId);
  const glass = getCatalogItem("glasses", item.glassId);
  const colorCost = calcColorCost(base, color, item);
  const glassCost = percentOrFixed(base, glass, item);
  const extensionCost = calcExtension(item);
  const shutterCost = calcAccessory(item, item.shutterId);
  const mosquitoCost = calcAccessory(item, item.mosquitoId);
  const installCost = calcAccessory(item, item.installId);
  const shutterInstallCost = calcAccessory(item, item.shutterInstallId);
  const mosquitoInstallCost = calcAccessory(item, item.mosquitoInstallId);
  const accessoriesCost = shutterCost + mosquitoCost;
  const installationCost = installCost + shutterInstallCost + mosquitoInstallCost;
  const unitCost = base + colorCost + glassCost + extensionCost + accessoriesCost + installationCost;
  const totals = pricing.calculateLineTotals(unitCost, item.quantity, quotePricingOptions(quote));
  return {
    cost: totals.cost,
    net: totals.net,
    vatAmount: totals.vatAmount,
    gross: totals.gross,
    unitCost,
    usedWidth: matrix.usedWidth,
    usedHeight: matrix.usedHeight,
    matrixNote: matrix.note,
    priceBasisLabel: "Ármátrix méret",
    priceBasisValue: `${matrix.usedWidth} x ${matrix.usedHeight} mm`,
    blocked: false,
    parts: {
      base,
      color: colorCost,
      glass: glassCost,
      extension: extensionCost,
      accessories: accessoriesCost,
      installation: installationCost,
      shutter: shutterCost,
      mosquito: mosquitoCost,
      install: installCost,
      shutterInstall: shutterInstallCost,
      mosquitoInstall: mosquitoInstallCost
    }
  };
}

function blockedCalcResult(matrix) {
  return {
    cost: 0,
    net: 0,
    vatAmount: 0,
    gross: 0,
    unitCost: 0,
    usedWidth: matrix.usedWidth,
    usedHeight: matrix.usedHeight,
    matrixNote: matrix.note,
    priceBasisLabel: "Ármátrix méret",
    priceBasisValue: `${matrix.usedWidth} x ${matrix.usedHeight} mm`,
    blocked: true,
    parts: {
      base: 0,
      color: 0,
      glass: 0,
      extension: 0,
      accessories: 0,
      installation: 0,
      shutter: 0,
      mosquito: 0,
      install: 0,
      shutterInstall: 0,
      mosquitoInstall: 0
    }
  };
}

function calcInteriorDoorItem(item, quote = getSelectedQuote()) {
  const model = interiorModel(item.interiorModelId);
  const finish = interiorFinishOptions.find((option) => option.id === item.interiorFinish) || interiorFinishOptions[0];
  const color = interiorColor(item.interiorColorId);
  const frame = interiorFrame(item.interiorFrameId);
  const handle = interiorHandle(item.interiorHandleId);
  const lock = interiorLock(item.interiorLockId);
  const manufacturer = interiorManufacturer(item.interiorManufacturerId);
  const base = Number(model?.[finish.priceField] || 0);
  const customFrameCost = calcInteriorCustomFrameCost(item, model, finish);
  const frameCost = item.interiorCustomFrame && model?.customFrameEnabled ? customFrameCost : Number(frame?.price || 0);
  const handleCost = Number(handle?.price || 0);
  const lockCost = Number(lock?.price || 0);
  const installCost = calcAccessory(item, item.installId);
  const unitCost = base + frameCost + handleCost + lockCost + installCost;
  const totals = pricing.calculateLineTotals(unitCost, item.quantity, quotePricingOptions(quote));
  return {
    cost: totals.cost,
    net: totals.net,
    vatAmount: totals.vatAmount,
    gross: totals.gross,
    unitCost,
    usedWidth: item.width,
    usedHeight: item.height,
    matrixNote: manufacturer?.sizing === "standard" ? "Standard beltéri méret" : "Egyedi méret, fix modellár",
    priceBasisLabel: "Beltéri ajtó ár",
    priceBasisValue: `${finish.name} · ${model?.name || "Nincs modell"}`,
    parts: {
      base,
      color: 0,
      colorLabel: color ? `Szín: ${color.name}` : "Szín",
      glass: frameCost,
      glassLabel: item.interiorCustomFrame && model?.customFrameEnabled ? "Egyedi tok felár" : "Tokvastagság",
      extension: handleCost + lockCost,
      extensionLabel: "Kilincs + zár",
      accessories: 0,
      installation: installCost,
      install: installCost
    }
  };
}

function calcInteriorCustomFrameCost(item, model, finish) {
  return pricing.calcInteriorCustomFrameCost(item, model, finish.id);
}

function interiorIncludedFrameCm(model, finishId) {
  return pricing.interiorIncludedFrameCm(model, finishId);
}

function getMatrixPrice(profileId, productTypeId, width, height) {
  const profile = getProfile(profileId) || state.catalog.profiles[0];
  const opening = exteriorOpeningTypes().find((item) => item.id === productTypeId) || exteriorOpeningTypes().find((item) => item.productTypeId === productTypeId) || exteriorOpeningTypes()[0];
  const type = matrixTypeForOpening(opening);
  const key = matrixKey(profile.id, opening.id);
  if (!state.catalog.matrices[key]) state.catalog.matrices[key] = createMatrix(profile, type);
  const matrix = state.catalog.matrices[key];
  matrix.blocked = matrix.blocked || {};
  return pricing.resolveMatrixCell(matrix, width, height);
}

function nearestCeil(values, target) {
  return pricing.nearestCeil(values, target);
}

function percentOrFixed(base, option, item) {
  return pricing.percentOrFixed(base, option, item);
}

function calcColorCost(base, color, item) {
  return pricing.calcColorCost(base, color, item);
}

function calcExtension(item) {
  if (!item.extensionMm) return 0;
  const ext = state.catalog.extensions.find((row) => String(row.mm) === String(item.extensionMm));
  return pricing.calcExtension(item, ext);
}

function calcAccessory(item, accessoryId) {
  const accessory = state.catalog.accessories.find((row) => row.id === accessoryId);
  return pricing.calcAccessory(item, accessory);
}

function areaM2(item) {
  return pricing.areaM2(item);
}

function quotePricingOptions(quote = getSelectedQuote()) {
  return {
    margin: quote?.margin ?? state.settings.defaultMargin ?? 0,
    vat: quote?.vat ?? state.settings.vat ?? 0
  };
}

function accessoriesBy(category) {
  return state.catalog.accessories.filter((item) => item.category === category);
}

function exteriorOpeningTypes() {
  return (state.catalog.exteriorOpenings?.length ? state.catalog.exteriorOpenings : openingTypes).filter((item) => item.productTypeId !== "interior-door");
}

function matrixTypeForOpening(opening) {
  const productType = productTypes.find((item) => item.id === opening?.productTypeId) || productTypes[0];
  return { ...productType, id: opening?.id || productType.id };
}

function interiorManufacturer(id) {
  return state.catalog.interiorDoors.manufacturers.find((item) => item.id === id);
}

function interiorModel(id) {
  return state.catalog.interiorDoors.models.find((item) => item.id === id);
}

function interiorModelsForManufacturer(manufacturerId) {
  return state.catalog.interiorDoors.models.filter((item) => item.manufacturerId === manufacturerId);
}

function interiorColor(id) {
  return state.catalog.interiorDoors.colors.find((item) => item.id === id);
}

function interiorFrame(id) {
  return state.catalog.interiorDoors.frames.find((item) => item.id === id);
}

function interiorHandle(id) {
  return state.catalog.interiorDoors.handles.find((item) => item.id === id);
}

function interiorLock(id) {
  return state.catalog.interiorDoors.locks.find((item) => item.id === id);
}

function parseInteriorSizes(value = "") {
  return value
    .split(/[,;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [width, height] = part.split(/[x×]/i).map((piece) => Number(piece.trim()));
      if (!width || !height) return null;
      return {
        id: `${width}x${height}`,
        width,
        height,
        label: `${width} x ${height} mm`
      };
    })
    .filter(Boolean);
}

function getInteriorDoorImage(item) {
  return interiorModel(item.interiorModelId)?.images?.[item.interiorColorId] || "";
}

function interiorItemTitle(item) {
  const model = interiorModel(item.interiorModelId);
  const finish = interiorFinishOptions.find((option) => option.id === item.interiorFinish);
  return `${finish?.name || "Beltéri ajtó"} · ${model?.name || "Nincs modell"}`;
}

function itemTitle(item) {
  return item.productTypeId === "interior-door" ? interiorItemTitle(item) : openingName(item.openingTypeId);
}

function itemSubtitle(item) {
  if (item.productTypeId === "interior-door") {
    const manufacturer = interiorManufacturer(item.interiorManufacturerId);
    return `${manufacturer?.name || "Nincs gyártó"} · ${interiorColor(item.interiorColorId)?.name || "Nincs szín"}`;
  }
  const profile = getProfile(item.profileId);
  return `${profile?.manufacturer || ""} · ${profile?.name || ""}`;
}

function itemOptionTags(item) {
  if (item.productTypeId === "interior-door") {
    return [
      interiorColor(item.interiorColorId)?.name,
      item.interiorCustomFrame ? `Egyedi tok ${number(item.interiorFrameDepthCm)} cm` : interiorFrame(item.interiorFrameId)?.name,
      interiorHandle(item.interiorHandleId)?.name,
      interiorLock(item.interiorLockId)?.name
    ].filter(Boolean).map((label) => `<span class="tag">${esc(label)}</span>`).join("");
  }
  return `
    <span class="tag">${esc(colorName(item.colorId))}</span>
    <span class="tag">${esc(colorModeName(item.colorMode))}</span>
    <span class="tag">${esc(glassName(item.glassId))}</span>
    ${item.extensionMm ? `<span class="tag">${esc(item.extensionMm)} mm toktoldó</span>` : ""}
    ${item.shutterId ? `<span class="tag">Redőny</span>` : ""}
    ${item.mosquitoId ? `<span class="tag">Szúnyogháló</span>` : ""}
  `;
}

function interiorPrintDetails(item) {
  const manufacturer = interiorManufacturer(item.interiorManufacturerId);
  const model = interiorModel(item.interiorModelId);
  const finish = interiorFinishOptions.find((option) => option.id === item.interiorFinish);
  return `${manufacturer?.name || "Nincs gyártó"} · ${finish?.name || "Beltéri ajtó"} · ${model?.name || "Nincs modell"}`;
}

function interiorPrintOptions(item) {
  const tok = item.interiorCustomFrame ? `Egyedi tok ${number(item.interiorFrameDepthCm)} cm` : (interiorFrame(item.interiorFrameId)?.name || "-");
  return `Szín: ${interiorColor(item.interiorColorId)?.name || "-"} · Tok: ${tok} · Kilincs: ${interiorHandle(item.interiorHandleId)?.name || "-"} · Zár: ${interiorLock(item.interiorLockId)?.name || "-"}`;
}

function openingName(id) {
  return state.catalog.exteriorOpenings?.find((item) => item.id === id)?.name || openingTypes.find((item) => item.id === id)?.name || "Nyílászáró";
}

function colorName(id) {
  return getCatalogItem("colors", id)?.name || "Nincs szín";
}

function colorModeName(mode) {
  return mode === "both" ? "Kívül-belül színes" : "Kívül színes";
}

function glassName(id) {
  return getCatalogItem("glasses", id)?.name || "Nincs üveg";
}

function formatThermalInfo(item) {
  const profile = getProfile(item.profileId);
  const glass = getCatalogItem("glasses", item.glassId);
  if (!profile) return "Nincs profiladat";
  const ug = Number(glass?.layers) === 3 ? profile.ug3 : profile.ug2;
  return `UF ${profile.uf || "-"} · UG ${ug || glass?.ug || "-"}`;
}

function accessoryLine(item, quote, calc = calcItem(item, quote)) {
  const lines = accessoryCostLines(item, quote, calc);
  return lines.length ? `${lines.map((line) => `${esc(line.label)}: ${money(line.net)}`).join("<br />")}<br />` : "";
}

function accessoryCostLines(item, quote, calc) {
  const margin = quote?.margin ?? state.settings.defaultMargin ?? 0;
  const quantity = Number(item.quantity || 1);
  const lines = [];
  const entries = [
    [item.shutterId, "Redőny", calc.parts.shutter],
    [item.shutterInstallId, "Redőny beépítés", calc.parts.shutterInstall],
    [item.mosquitoId, "Szúnyogháló", calc.parts.mosquito],
    [item.mosquitoInstallId, "Szúnyogháló beépítés", calc.parts.mosquitoInstall],
    [item.installId, "Beépítés", calc.parts.install || calc.parts.installation]
  ];
  entries.forEach(([id, fallback, cost]) => {
    const accessory = state.catalog.accessories.find((row) => row.id === id);
    if (accessory && Number(cost || 0) > 0) {
      lines.push({ label: `${fallback} - ${accessory.name}`, net: pricing.applyMargin(Number(cost || 0) * quantity, margin) });
    }
  });
  return lines;
}

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function renderOpeningSvg(typeId, width = 1200, height = 1500, compact = false) {
  const w = Number(width || 0);
  const h = Number(height || 0);
  const labelSize = compact ? 12 : 14;
  const stroke = compact ? 3 : 4;
  const muted = "#7a878a";
  const frame = "#163238";
  const sash = "#0f766e";
  const glass = "#dff2f0";
  const lines = [];
  lines.push(`<rect x="58" y="28" width="244" height="184" rx="3" fill="${glass}" stroke="${frame}" stroke-width="${stroke}" />`);
  lines.push(`<rect x="72" y="42" width="216" height="156" rx="2" fill="none" stroke="${frame}" stroke-width="${stroke - 1}" />`);

  if (typeId === "turn") {
    lines.push(`<line x1="72" y1="42" x2="288" y2="198" stroke="${sash}" stroke-width="2.5" />`);
    lines.push(`<path d="M95 120 Q138 70 183 120" fill="none" stroke="${sash}" stroke-width="2.5" />`);
  } else if (typeId === "tilt") {
    lines.push(`<path d="M72 42 L180 154 L288 42" fill="none" stroke="${sash}" stroke-width="2.5" />`);
  } else if (typeId === "tilt-turn") {
    lines.push(`<line x1="72" y1="42" x2="288" y2="198" stroke="${sash}" stroke-width="2.5" />`);
    lines.push(`<path d="M72 42 L180 154 L288 42" fill="none" stroke="${sash}" stroke-width="2.5" />`);
  } else if (typeId === "double-tilt-turn") {
    lines.push(`<line x1="180" y1="28" x2="180" y2="212" stroke="${frame}" stroke-width="${stroke}" />`);
    lines.push(`<line x1="72" y1="42" x2="180" y2="198" stroke="${sash}" stroke-width="2.5" />`);
    lines.push(`<path d="M72 42 L126 154 L180 42" fill="none" stroke="${sash}" stroke-width="2.5" />`);
    lines.push(`<line x1="288" y1="42" x2="180" y2="198" stroke="${sash}" stroke-width="2.5" />`);
    lines.push(`<path d="M180 42 L234 154 L288 42" fill="none" stroke="${sash}" stroke-width="2.5" />`);
  } else if (typeId === "divided") {
    lines.push(`<line x1="180" y1="28" x2="180" y2="212" stroke="${frame}" stroke-width="${stroke}" />`);
    lines.push(`<line x1="58" y1="120" x2="302" y2="120" stroke="${frame}" stroke-width="${stroke}" />`);
    lines.push(`<line x1="72" y1="42" x2="180" y2="120" stroke="${sash}" stroke-width="2.2" />`);
    lines.push(`<line x1="288" y1="198" x2="180" y2="120" stroke="${sash}" stroke-width="2.2" />`);
  } else if (typeId === "balcony" || typeId === "door" || typeId === "entrance-door") {
    lines.length = 0;
    lines.push(`<rect x="100" y="18" width="160" height="214" rx="3" fill="${glass}" stroke="${frame}" stroke-width="${stroke}" />`);
    lines.push(`<rect x="114" y="34" width="132" height="182" rx="2" fill="none" stroke="${frame}" stroke-width="${stroke - 1}" />`);
    if (typeId === "door") lines.push(`<circle cx="228" cy="126" r="4" fill="${sash}" />`);
    else lines.push(`<line x1="114" y1="34" x2="246" y2="216" stroke="${sash}" stroke-width="2.5" />`);
  } else if (typeId === "fixed") {
    lines.push(`<line x1="72" y1="42" x2="288" y2="198" stroke="${sash}" stroke-width="2.1" opacity="0.6" />`);
    lines.push(`<line x1="288" y1="42" x2="72" y2="198" stroke="${sash}" stroke-width="2.1" opacity="0.6" />`);
  }

  return `
    <svg class="opening-svg" viewBox="0 0 360 260" role="img" aria-label="${esc(openingName(typeId))}">
      <defs>
        <marker id="arrow-${typeId}" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
          <path d="M0,0 L7,3.5 L0,7 Z" fill="${muted}" />
        </marker>
      </defs>
      ${lines.join("")}
      <line x1="58" y1="232" x2="302" y2="232" stroke="${muted}" stroke-width="1.5" marker-start="url(#arrow-${typeId})" marker-end="url(#arrow-${typeId})" />
      <line x1="326" y1="28" x2="326" y2="212" stroke="${muted}" stroke-width="1.5" marker-start="url(#arrow-${typeId})" marker-end="url(#arrow-${typeId})" />
      <text x="180" y="252" text-anchor="middle" font-size="${labelSize}" font-weight="700" fill="${muted}">${number(w)} mm</text>
      <text x="344" y="124" transform="rotate(90 344 124)" text-anchor="middle" font-size="${labelSize}" font-weight="700" fill="${muted}">${number(h)} mm</text>
    </svg>
  `;
}

function icon(name, className = "button-icon") {
  const common = `class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const paths = {
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h6" />',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />',
    factory: '<path d="M2 20h20" /><path d="M4 20V8l6 4V8l6 4V5h4v15" /><path d="M8 16h1" /><path d="M13 16h1" /><path d="M18 16h1" />',
    door: '<path d="M5 21h14" /><path d="M7 21V3h10v18" /><path d="M14 12h.01" />',
    grid: '<rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />',
    layers: '<path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="m2 17 10 5 10-5" /><path d="m2 12 10 5 10-5" />',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.4 1.08V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8.6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1.08-.4H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.37-.15.68-.39.9-.7.23-.31.35-.69.35-1.08V3a2 2 0 1 1 4 0v.09c0 .39.12.77.35 1.08.22.31.53.55.9.7.62.26 1.33.12 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.15.37.39.68.7.9.31.23.69.35 1.08.35H21a2 2 0 1 1 0 4h-.09c-.39 0-.77.12-1.08.35-.31.22-.55.53-.7.9Z" />',
    plus: '<path d="M12 5v14" /><path d="M5 12h14" />',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />',
    check: '<path d="M20 6 9 17l-5-5" />',
    x: '<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
    send: '<path d="m22 2-7 20-4-9-9-4 20-7Z" /><path d="M22 2 11 13" />',
    print: '<path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" />',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />',
    trash: '<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />',
    edit: '<path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" />',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />',
    wand: '<path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" /><path d="m17.8 6.2 1.4-1.4" /><path d="m10.8 13.2-1.4 1.4" /><path d="m17.8 11.8 1.4 1.4" /><path d="m10.8 4.8-1.4-1.4" /><path d="M6 21 21 6l-3-3L3 18l3 3Z" />'
  };
  return `<svg ${common}>${paths[name] || paths.file}</svg>`;
}
