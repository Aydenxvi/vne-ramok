'use strict';
/*
 * The cart drawer: rendering, quantity +/-, remove, and the small
 * "flying to cart" add-to-cart flourish. The real checkout flow lives in
 * storefront.js (server-backed order form); this file only owns the bag.
 */

function renderCart() {
  count();
  $('cart-items').innerHTML = cart.length
    ? cart.map((x, i) => {
        const p = find(x.id);
        return `<div class="cart-row">${visual(p)}<div><strong>${esc(p.name)}</strong><p>${esc(x.size)} / ${esc(x.color)}</p><div class="qty"><button data-qty="${i}" data-delta="-1" aria-label="Уменьшить количество ${esc(p.name)}">−</button><span>${x.qty}</span><button data-qty="${i}" data-delta="1" aria-label="Увеличить количество ${esc(p.name)}" ${x.qty === 99 ? 'disabled' : ''}>+</button></div></div><div><strong>${money(p.price * x.qty)}</strong><br><button class="remove" data-remove="${i}" aria-label="Удалить ${esc(p.name)} из сумки">Удалить</button></div></div>`;
      }).join('')
    : '<p class="empty">Пока пусто. Твоя следующая любимая вещь — в каталоге.</p>';
  $('cart-total').textContent = money(totals());
  $('checkout-open').disabled = !cart.length;
}

$('cart-open').onclick = () => { renderCart(); openDialog('cart-dialog'); };

// Re-rendering a row replaces its DOM node and drops focus to <body>; restore
// it to the equivalent control afterwards so repeated keyboard qty/remove
// actions stay usable.
function focusCartRow(index, prefer) {
  const rows = $('cart-items').querySelectorAll('.cart-row');
  const row = rows[index] || rows[index - 1];
  const btn = row && (prefer === 'qty-plus' ? row.querySelector('[data-delta="1"]') : prefer === 'qty-minus' ? row.querySelector('[data-delta="-1"]') : row.querySelector('.remove'));
  if (btn) { btn.focus(); return; }
  $('cart-dialog').querySelector('.close')?.focus();
}

$('cart-items').onclick = e => {
  const qtyBtn = e.target.closest('[data-qty]');
  const removeBtn = e.target.closest('[data-remove]');
  if (qtyBtn) {
    const i = +qtyBtn.dataset.qty, delta = +qtyBtn.dataset.delta;
    cart[i].qty += delta;
    const removed = cart[i].qty < 1;
    if (removed) cart.splice(i, 1);
    renderCart();
    focusCartRow(i, removed ? 'remove' : (delta > 0 ? 'qty-plus' : 'qty-minus'));
  }
  if (removeBtn) {
    const i = +removeBtn.dataset.remove;
    cart.splice(i, 1);
    renderCart();
    focusCartRow(i, 'remove');
  }
};

// A short-lived clone of the triggering button's icon arcs toward the cart
// toggle and fades out — purely decorative, skipped entirely under
// prefers-reduced-motion or when either endpoint isn't on screen.
function flyToCart(originEl) {
  const target = $('cart-open');
  if (reduced.matches || !originEl || !target) return;
  const from = originEl.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return;
  const ghost = document.createElement('span');
  ghost.className = 'fly-to-cart';
  ghost.style.left = from.left + from.width / 2 - 9 + 'px';
  ghost.style.top = from.top + from.height / 2 - 9 + 'px';
  ghost.style.setProperty('--fly-dx', to.left + to.width / 2 - (from.left + from.width / 2) + 'px');
  ghost.style.setProperty('--fly-dy', to.top + to.height / 2 - (from.top + from.height / 2) + 'px');
  document.body.appendChild(ghost);
  ghost.addEventListener('animationend', () => ghost.remove(), { once: true });
}
