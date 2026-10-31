'use strict';
// Pure cart/pricing helpers, dependency-free so both app.js (browser) and tests/ (Node) can use them.
(function (root) {
  function computeTotal(items, products) {
    return items.reduce((sum, item) => {
      const p = products.find(x => x.id === item.id);
      return p ? sum + p.price * item.qty : sum;
    }, 0);
  }

  // A product's own color list, or a single-entry fallback built from its legacy `color`
  // string for products.js records written before variants existed.
  function colorsOf(product) {
    return (product.colors && product.colors.length) ? product.colors : [{ name: product.color, hex: '#888' }];
  }

  // Drops any line whose product/color/size no longer exists or whose qty is out of range —
  // protects against hand-edited or corrupted localStorage. A missing/unknown `color` on an
  // older stored line is migrated to the product's default (first) color instead of being
  // dropped, so carts saved before variants existed keep working.
  function sanitizeCart(raw, products, maxQty = 99) {
    if (!Array.isArray(raw)) return [];
    return raw.map(x => {
      if (!x || typeof x !== 'object') return null;
      const p = products.find(pr => pr.id === x.id);
      if (!p) return null;
      if (!p.sizes.includes(x.size)) return null;
      if (!Number.isInteger(x.qty) || x.qty < 1 || x.qty > maxQty) return null;
      const colors = colorsOf(p);
      const color = colors.find(c => c.name === x.color) ? x.color : colors[0].name;
      return { id: x.id, color, size: x.size, qty: x.qty };
    }).filter(Boolean);
  }

  function sanitizeFavorites(raw, products) {
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw)].filter(id => products.some(p => p.id === id));
  }

  // A cart line's SKU is product id + color + size. Mutates and returns `cart`.
  function addToCart(cart, id, color, size, maxQty = 99) {
    const existing = cart.find(x => x.id === id && x.color === color && x.size === size);
    if (existing) {
      if (existing.qty >= maxQty) return { cart, added: false, capped: true };
      existing.qty++;
      return { cart, added: true, capped: false };
    }
    cart.push({ id, color, size, qty: 1 });
    return { cart, added: true, capped: false };
  }

  const api = { computeTotal, sanitizeCart, sanitizeFavorites, addToCart, colorsOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VRCart = api;
})(typeof window !== 'undefined' ? window : globalThis);
