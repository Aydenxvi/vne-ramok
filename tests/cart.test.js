'use strict';
const VRCart = require('../cart.js');

const products = [
  { id: 'a', price: 1000, sizes: ['S', 'M'], color: 'Indigo', colors: [{ name: 'Indigo', hex: '#333' }, { name: 'Black', hex: '#000' }] },
  { id: 'b', price: 2500, sizes: ['ONE SIZE'], color: 'Black', colors: [{ name: 'Black', hex: '#000' }] },
];

module.exports = [
  {
    name: 'computeTotal sums price * qty across lines',
    fn(assert) {
      const total = VRCart.computeTotal([{ id: 'a', color: 'Indigo', size: 'S', qty: 2 }, { id: 'b', color: 'Black', size: 'ONE SIZE', qty: 1 }], products);
      assert.strictEqual(total, 1000 * 2 + 2500);
    },
  },
  {
    name: 'computeTotal of an empty cart is 0',
    fn(assert) {
      assert.strictEqual(VRCart.computeTotal([], products), 0);
    },
  },
  {
    name: 'computeTotal ignores a line whose product id no longer exists',
    fn(assert) {
      const total = VRCart.computeTotal([{ id: 'ghost', color: 'Indigo', size: 'M', qty: 3 }], products);
      assert.strictEqual(total, 0);
    },
  },
  {
    name: 'same product in two sizes (same color) stays two distinct lines',
    fn(assert) {
      const cart = [];
      VRCart.addToCart(cart, 'a', 'Indigo', 'S');
      VRCart.addToCart(cart, 'a', 'Indigo', 'M');
      assert.strictEqual(cart.length, 2);
      assert.strictEqual(cart.find(x => x.size === 'S').qty, 1);
      assert.strictEqual(cart.find(x => x.size === 'M').qty, 1);
    },
  },
  {
    name: 'same product + size in two colors stays two distinct lines (SKU = id + color + size)',
    fn(assert) {
      const cart = [];
      VRCart.addToCart(cart, 'a', 'Indigo', 'S');
      VRCart.addToCart(cart, 'a', 'Black', 'S');
      assert.strictEqual(cart.length, 2);
      assert.strictEqual(cart.find(x => x.color === 'Indigo').qty, 1);
      assert.strictEqual(cart.find(x => x.color === 'Black').qty, 1);
    },
  },
  {
    name: 'adding the same product + color + size twice increments qty instead of duplicating the line',
    fn(assert) {
      const cart = [];
      VRCart.addToCart(cart, 'a', 'Indigo', 'S');
      VRCart.addToCart(cart, 'a', 'Indigo', 'S');
      assert.strictEqual(cart.length, 1);
      assert.strictEqual(cart[0].qty, 2);
    },
  },
  {
    name: 'addToCart caps quantity at maxQty and reports capped instead of overshooting',
    fn(assert) {
      const cart = [{ id: 'a', color: 'Indigo', size: 'S', qty: 99 }];
      const result = VRCart.addToCart(cart, 'a', 'Indigo', 'S');
      assert.strictEqual(result.capped, true);
      assert.strictEqual(cart[0].qty, 99);
    },
  },
  {
    name: 'sanitizeCart keeps only valid lines (existing product, valid size, integer qty 1-99)',
    fn(assert) {
      const raw = [
        { id: 'a', color: 'Indigo', size: 'S', qty: 1 },
        { id: 'a', color: 'Indigo', size: 'XL', qty: 1 }, // size not offered by product a
        { id: 'ghost', color: 'Indigo', size: 'S', qty: 1 }, // product no longer exists
        { id: 'a', color: 'Indigo', size: 'M', qty: 0 }, // qty out of range
        { id: 'a', color: 'Indigo', size: 'M', qty: 1.5 }, // non-integer qty
        { id: 'a', color: 'Indigo', size: 'M', qty: 100 }, // qty over cap
        null, // malformed entry
        'not-an-object',
      ];
      const clean = VRCart.sanitizeCart(raw, products);
      assert.strictEqual(clean.length, 1);
      assert.deepStrictEqual(clean[0], { id: 'a', color: 'Indigo', size: 'S', qty: 1 });
    },
  },
  {
    name: 'sanitizeCart migrates a line with no/unknown color to the product default color instead of dropping it',
    fn(assert) {
      const noColor = VRCart.sanitizeCart([{ id: 'a', size: 'S', qty: 1 }], products);
      assert.strictEqual(noColor[0].color, 'Indigo');
      const unknownColor = VRCart.sanitizeCart([{ id: 'a', color: 'Purple', size: 'S', qty: 1 }], products);
      assert.strictEqual(unknownColor[0].color, 'Indigo');
    },
  },
  {
    name: 'sanitizeCart treats a non-array (corrupted localStorage) as an empty cart',
    fn(assert) {
      assert.deepStrictEqual(VRCart.sanitizeCart({ not: 'an array' }, products), []);
      assert.deepStrictEqual(VRCart.sanitizeCart(null, products), []);
      assert.deepStrictEqual(VRCart.sanitizeCart(42, products), []);
    },
  },
  {
    name: 'sanitizeFavorites drops ids for products that no longer exist and de-dupes',
    fn(assert) {
      const clean = VRCart.sanitizeFavorites(['a', 'a', 'ghost', 'b'], products);
      assert.deepStrictEqual(clean.sort(), ['a', 'b']);
    },
  },
  {
    name: 'colorsOf falls back to a single entry built from the legacy `color` string',
    fn(assert) {
      const legacy = { color: 'Olive' };
      assert.deepStrictEqual(VRCart.colorsOf(legacy).map(c => c.name), ['Olive']);
    },
  },
];
