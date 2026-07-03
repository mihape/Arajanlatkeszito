const assert = require("assert");
const pricing = require("../src/shared/pricing-calculations");

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("price matrix rounds width and height upward to the next cell", () => {
  const result = pricing.resolveMatrixCell({
    widths: [1000, 1100, 1200],
    heights: [1200, 1300],
    prices: { "1100x1300": 58000 },
    blocked: {}
  }, 1001, 1201);

  assert.equal(result.usedWidth, 1100);
  assert.equal(result.usedHeight, 1300);
  assert.equal(result.price, 58000);
  assert.equal(result.blocked, false);
});

test("price matrix blocked cell returns no price and a blocked flag", () => {
  const result = pricing.resolveMatrixCell({
    widths: [1000, 1100],
    heights: [1200, 1300],
    prices: { "1100x1300": 58000 },
    blocked: { "1100x1300": true }
  }, 1040, 1290);

  assert.equal(result.usedWidth, 1100);
  assert.equal(result.usedHeight, 1300);
  assert.equal(result.price, 0);
  assert.equal(result.blocked, true);
});

test("VAT supports 0, 5, 27 and FAD", () => {
  assert.equal(pricing.calculateLineTotals(100000, 1, { margin: 0, vat: 0 }).gross, 100000);
  assert.equal(pricing.calculateLineTotals(100000, 1, { margin: 0, vat: 5 }).gross, 105000);
  assert.equal(pricing.calculateLineTotals(100000, 1, { margin: 0, vat: 27 }).gross, 127000);
  assert.equal(pricing.calculateLineTotals(100000, 1, { margin: 0, vat: "FAD" }).gross, 100000);
});

test("margin is applied before VAT", () => {
  const result = pricing.calculateLineTotals(100000, 1, { margin: 30, vat: 27 });

  assert.equal(result.cost, 100000);
  assert.equal(result.net, 130000);
  assert.equal(result.vatAmount, 35100);
  assert.equal(result.gross, 165100);
});

test("shutter, mosquito screen and installation accessories calculate by pricing mode", () => {
  const item = { width: 2000, height: 1500 };

  assert.equal(pricing.calcAccessory(item, { pricing: "width", price: 10000 }), 20000);
  assert.equal(pricing.calcAccessory(item, { pricing: "area", price: 5000 }), 15000);
  assert.equal(pricing.calcAccessory(item, { pricing: "perimeter", price: 1000 }), 7000);
  assert.equal(pricing.calcAccessory(item, { pricing: "fixed", price: 8500 }), 8500);
});

test("interior custom frame surcharge is calculated after the included depth", () => {
  const model = {
    customFrameEnabled: true,
    decorIncludedFrameCm: 12,
    cplIncludedFrameCm: 15,
    customFrameSurchargePerCm: 5200
  };

  assert.equal(pricing.calcInteriorCustomFrameCost({
    interiorCustomFrame: true,
    interiorFrameDepthCm: 17
  }, model, "cpl"), 10400);

  assert.equal(pricing.calcInteriorCustomFrameCost({
    interiorCustomFrame: true,
    interiorFrameDepthCm: 11
  }, model, "decor"), 0);
});
