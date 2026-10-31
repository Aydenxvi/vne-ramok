'use strict';
/*
 * "НОВЫЙ ДРОП" card shuffle: one persistent DOM node per product. Slot
 * changes transition via CSS; the front card gets a dedicated exit
 * animation instead of being torn down and rebuilt, so the remaining cards
 * visibly spring forward in the same motion.
 */

let order = PRODUCTS.filter(p => p.new).map(p => p.id);
let shuffling = false;
let paused = reduced.matches;

function cardHTML(id) {
  const p = find(id);
  return `<article class="shuffle-card" data-id="${id}">${visual(p)}<span class="card-number">DROP 01 / ${String(PRODUCTS.indexOf(p) + 1).padStart(2, '0')}</span><div class="card-caption"><div><strong>${esc(p.name)}</strong><br>${money(p.price)}</div><button data-product="${id}" aria-label="Открыть ${esc(p.name)}">↗</button></div></article>`;
}

function buildStack() {
  $('card-stack').innerHTML = order.length ? order.map(cardHTML).join('') : '<p class="empty">Новый дроп скоро появится.</p>';
  applySlots();
}

function applySlots() {
  if (!order.length) {
    $('shuffle-position').textContent = '0 / 0 — СЛЕДУЮЩИЙ ДРОП СКОРО';
    $('shuffle-next').disabled = true;
    $('shuffle-prev').disabled = true;
    return;
  }
  order.forEach((id, slot) => {
    const el = $('card-stack').querySelector(`[data-id="${id}"]`);
    if (!el) return;
    el.style.setProperty('--slot', slot);
    const btn = el.querySelector('[data-product]');
    if (slot === 0) {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('inert');
      if (btn) btn.tabIndex = 0;
    } else {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute('inert', '');
      if (btn) btn.tabIndex = -1;
    }
  });
  const activeIndex = PRODUCTS.filter(p => p.new).findIndex(p => p.id === order[0]) + 1;
  $('shuffle-position').textContent = `${activeIndex} / ${order.length} — ${find(order[0]).name}`;
}

function advance(dir) {
  if (shuffling || order.length < 2) return;
  const stack = $('card-stack');
  // Disabling the next/prev button (right below) blurs it to <body> if it was
  // focused — same for `inert` on the old front card once applySlots() runs —
  // so capture where focus was *before* either happens, and restore it
  // afterwards (to that same control, now re-enabled, or to the new front
  // card), so repeated keyboard use stays usable.
  const activeBefore = document.activeElement;
  const controlFocused = (activeBefore === $('shuffle-next') || activeBefore === $('shuffle-prev')) ? activeBefore : null;
  const hadStackFocus = stack.contains(activeBefore);
  shuffling = true;
  $('shuffle-next').disabled = true;
  $('shuffle-prev').disabled = true;

  const restoreFocus = () => {
    if (controlFocused) controlFocused.focus();
    else if (hadStackFocus) stack.querySelector('[data-id]:not([inert]) [data-product]')?.focus();
  };
  const finish = () => {
    shuffling = false;
    $('shuffle-next').disabled = false;
    $('shuffle-prev').disabled = false;
    restoreFocus();
  };

  if (dir > 0) {
    const frontId = order[0], frontEl = stack.querySelector(`[data-id="${frontId}"]`);
    order.push(order.shift());
    frontEl.classList.add('leaving');
    applySlots();
    const after = () => {
      frontEl.classList.add('no-anim');
      frontEl.classList.remove('leaving');
      void frontEl.offsetWidth;
      frontEl.classList.remove('no-anim');
      finish();
    };
    reduced.matches ? after() : setTimeout(after, 620);
  } else {
    order.unshift(order.pop());
    applySlots();
    reduced.matches ? finish() : setTimeout(finish, 620);
  }
}

$('shuffle-next').onclick = () => advance(1);
$('shuffle-prev').onclick = () => advance(-1);
$('card-stack').onclick = e => {
  const b = e.target.closest('[data-product]');
  if (b && !shuffling) showProduct(b.dataset.product);
};
$('drop').addEventListener('keydown', e => {
  if (!e.target.closest('.card-stack') && !e.target.closest('.controls')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); advance(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); advance(-1); }
});

let touchX = 0, touchY = 0;
$('card-stack').addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touchX = t.clientX; touchY = t.clientY;
}, { passive: true });
$('card-stack').addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchX, dy = t.clientY - touchY;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) advance(dx < 0 ? 1 : -1);
}, { passive: true });

function pauseUI() {
  $('shuffle-pause').textContent = paused ? 'Автопрокрутка' : 'Пауза';
  $('shuffle-pause').setAttribute('aria-pressed', paused);
}
$('shuffle-pause').onclick = () => { paused = !paused; pauseUI(); };
reduced.addEventListener('change', e => { if (e.matches) { paused = true; pauseUI(); } });

let dropVisible = false;
new IntersectionObserver(entries => { dropVisible = entries[0].isIntersecting; }, { threshold: .2 }).observe($('drop'));
setInterval(() => {
  if (!paused && dropVisible && !document.hidden && !document.querySelector('dialog[open]') && !$('drop').matches(':hover') && !$('drop').contains(document.activeElement)) advance(1);
}, 4000);
