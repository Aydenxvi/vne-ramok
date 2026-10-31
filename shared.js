'use strict';
/*
 * Core state and helpers shared by every storefront module: catalog.js,
 * product-detail.js, cart-panel.js, drop-stack.js, bridge.js, and (via the
 * window.VRStore bridge or these same bare globals — classic <script> tags
 * share one global lexical environment) wardrobe.js and storefront.js.
 *
 * Load order matters here, not file size: this file must run first because
 * everything else reads `$`, `money`, `cart`, `favorites`, `visual()`, etc.
 * as plain top-level bindings.
 */

const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const find = id => PRODUCTS.find(p => p.id === id);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const scrollTo = (el, opts = {}) => el.scrollIntoView({ ...opts, behavior: reduced.matches ? 'instant' : 'smooth' });

// Inline-vector concept icons for products that have no demo photo yet.
const paths = {
  jeans: 'M28 12H72L79 90H55L50 43L45 90H21Z M28 24H72 M50 12V36 M30 26L39 33 M70 26L61 33',
  hoodie: 'M36 28Q27 7 50 7Q73 7 64 28L76 34L91 73L75 79L66 56V92H34V56L25 79L9 73L24 34Z M36 28L50 37L64 28 M50 37V92 M39 63H61V78H39Z',
  jacket: 'M38 18L50 24L62 18L78 28L94 75L76 82L65 51V91H35V51L24 82L6 75L22 28Z M50 24V91 M36 62H45 M55 62H64 M38 18L35 9H65L62 18',
  tee: 'M34 17Q50 30 66 17L90 32L78 53L67 46V88H33V46L22 53L10 32Z M34 17Q50 43 66 17',
  hat: 'M21 63V45Q21 13 50 13Q79 13 79 45V63 M17 63H83V87H17Z M33 58V39 M45 58V29 M57 58V29 M69 58V39 M38 72H62V80H38Z',
  star: 'M50 8L59 34L83 17L67 42L94 50L67 58L83 83L59 66L50 92L41 66L17 83L33 58L6 50L33 42L17 17L41 34Z',
};

function icon(name) {
  return `<svg class="garment" viewBox="0 0 100 100" aria-hidden="true"><path d="${paths[name] || paths.star}" fill="currentColor" fill-opacity=".82" stroke="#151714" stroke-width="1.6" stroke-linejoin="round"/><path d="M42 73h16" stroke="#eeeade" stroke-width="2"/></svg>`;
}

// Product-card / cart-row visual: a real uploaded photo, a crop of the demo
// campaign photo, or (for pieces with neither) the inline concept icon.
function visual(p) {
  if (p.image) return `<div class="visual custom-photo" role="img" aria-label="${esc(p.name)} — фотография товара"><img src="${esc(p.image)}" loading="lazy" alt=""></div>`;
  if (p.photo !== undefined) return `<div class="visual photo photo-${p.photo}" role="img" aria-label="${esc(p.name)} — фото концепта"></div>`;
  return `<div class="visual drawing" data-color="${esc(p.color)}" role="img" aria-label="${esc(p.name)} — эскиз">${icon(p.icon)}</div>`;
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

let cart = VRCart.sanitizeCart(read('vr-cart', []), PRODUCTS);
let favorites = new Set(VRCart.sanitizeFavorites(read('vr-favorites', []), PRODUCTS));
let toastTimer;

function persist() {
  try {
    localStorage.setItem('vr-cart', JSON.stringify(cart));
    localStorage.setItem('vr-favorites', JSON.stringify([...favorites]));
  } catch { /* The demo stays usable if storage is unavailable. */ }
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2400);
}

function openDialog(id) { $(id).showModal(); }

function totals(items = cart) { return VRCart.computeTotal(items, PRODUCTS); }

function count() {
  $('cart-count').textContent = cart.reduce((sum, x) => sum + x.qty, 0);
  persist();
}

// Every <dialog> on the page gets the same close affordances: its own ×
// button, and a true backdrop click (not a click that merely bubbled up
// from content inside the dialog, which is why this checks the client
// rect instead of `e.target === d` on its own).
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (outside) dialog.close();
  });
}
