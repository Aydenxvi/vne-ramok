'use strict';
/*
 * Boots the storefront modules above and exposes a small public bridge for
 * account/checkout (storefront.js) and the outfit builder/lookbook
 * (wardrobe.js) to use instead of reaching into bare globals directly.
 * (Those two files still also read a few bare globals — cart, money, toast,
 * count, showProduct — which classic <script> tags share across files; the
 * bridge is the explicit, documented surface for anything new.)
 */

renderCatalog();
buildStack();
pauseUI();
count();

window.VRStore = {
  getCart: () => cart.map(x => ({ ...x })),
  getFavorites: () => [...favorites],
  setFavorites: ids => { favorites = new Set(VRCart.sanitizeFavorites(ids, PRODUCTS)); persist(); renderCatalog(); },
  clearCart: () => { cart = []; count(); renderCart(); },
  renderCart,
  showProduct,
  refresh: () => { renderCatalog(); buildStack(); count(); },
  money,
  toast,
};
