(function attachPricingModule(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NyilaszaroPricing = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPricingModule() {
  function toNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function nearestCeil(values, target) {
    const numericValues = (values || [])
      .map((value) => toNumber(value, NaN))
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);
    if (!numericValues.length) return 0;
    return numericValues.find((value) => value >= toNumber(target)) || numericValues[numericValues.length - 1];
  }

  function resolveMatrixCell(matrix, width, height) {
    const usedWidth = nearestCeil(matrix?.widths, width);
    const usedHeight = nearestCeil(matrix?.heights, height);
    const cellKey = `${usedWidth}x${usedHeight}`;
    const blocked = Boolean(matrix?.blocked?.[cellKey]);
    const price = blocked ? 0 : toNumber(matrix?.prices?.[cellKey]);
    const rounded = usedWidth !== toNumber(width) || usedHeight !== toNumber(height);

    return {
      price,
      usedWidth,
      usedHeight,
      blocked,
      cellKey,
      note: blocked ? "Nem gyártható méret" : (rounded ? "100 mm raszterre kerekítve" : "Pontos mátrix cella")
    };
  }

  function getVatRate(vatValue) {
    return String(vatValue ?? 0).toUpperCase() === "FAD" ? 0 : toNumber(vatValue);
  }

  function applyMargin(cost, marginPercent) {
    return toNumber(cost) * (1 + toNumber(marginPercent) / 100);
  }

  function applyVat(net, vatValue) {
    return toNumber(net) * (getVatRate(vatValue) / 100);
  }

  function calculateLineTotals(unitCost, quantity, quote = {}) {
    const cost = toNumber(unitCost) * toNumber(quantity, 1);
    const net = applyMargin(cost, quote.margin);
    const vatAmount = applyVat(net, quote.vat);
    return {
      cost,
      net,
      vatAmount,
      gross: net + vatAmount
    };
  }

  function summarizeQuote(lines) {
    return (lines || []).reduce((acc, line) => {
      acc.cost += toNumber(line.cost);
      acc.net += toNumber(line.net);
      acc.vatAmount += toNumber(line.vatAmount);
      acc.gross += toNumber(line.gross);
      return acc;
    }, { cost: 0, net: 0, vatAmount: 0, gross: 0 });
  }

  function areaM2(item) {
    return (toNumber(item?.width) * toNumber(item?.height)) / 1000000;
  }

  function percentOrFixed(base, option, item) {
    if (!option) return 0;
    if (option.type === "fixed") return toNumber(option.value);
    if (option.type === "area") return areaM2(item) * toNumber(option.value);
    return toNumber(base) * (toNumber(option.value) / 100);
  }

  function calcColorCost(base, color, item) {
    if (!color) return 0;
    const value = item?.colorMode === "both" ? color.bothValue : color.outsideValue;
    if (color.type === "fixed") return toNumber(value);
    return toNumber(base) * (toNumber(value) / 100);
  }

  function calcExtension(item, extension) {
    if (!item?.extensionMm || !extension) return 0;
    const sides = item.extensionSides || {};
    const widthM = toNumber(item.width) / 1000;
    const heightM = toNumber(item.height) / 1000;
    const length =
      (sides.left ? heightM : 0) +
      (sides.right ? heightM : 0) +
      (sides.top ? widthM : 0) +
      (sides.bottom ? widthM : 0);
    return length * toNumber(extension.pricePerM);
  }

  function calcAccessory(item, accessory) {
    if (!accessory) return 0;
    const widthM = toNumber(item?.width) / 1000;
    const perimeterM = ((toNumber(item?.width) + toNumber(item?.height)) * 2) / 1000;
    const price = toNumber(accessory.price);
    if (accessory.pricing === "width") return widthM * price;
    if (accessory.pricing === "area") return areaM2(item) * price;
    if (accessory.pricing === "perimeter") return perimeterM * price;
    return price;
  }

  function interiorIncludedFrameCm(model, finishId) {
    return toNumber(finishId === "cpl" ? model?.cplIncludedFrameCm : model?.decorIncludedFrameCm);
  }

  function calcInteriorCustomFrameCost(item, model, finishId) {
    if (!item?.interiorCustomFrame || !model?.customFrameEnabled) return 0;
    const included = interiorIncludedFrameCm(model, finishId);
    const extraCm = Math.max(0, toNumber(item.interiorFrameDepthCm) - included);
    return extraCm * toNumber(model.customFrameSurchargePerCm);
  }

  return {
    nearestCeil,
    resolveMatrixCell,
    getVatRate,
    applyMargin,
    applyVat,
    calculateLineTotals,
    summarizeQuote,
    areaM2,
    percentOrFixed,
    calcColorCost,
    calcExtension,
    calcAccessory,
    interiorIncludedFrameCm,
    calcInteriorCustomFrameCost
  };
});
