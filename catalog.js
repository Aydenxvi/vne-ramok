'use strict';
/*
 * Section nav (category tiles + the orbit dialog), filters/search/sort, and
 * the product grid itself. Depends on shared.js having already run.
 */

let favoritesOnly = false;

function chooseCategory(id) {
  $('category-filter').value = id;
  renderCatalog();
  scrollTo($('catalog'));
}

$('category-filter').innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
$('size-filter').innerHTML += [...new Set(PRODUCTS.flatMap(p => p.sizes))].map(s => `<option>${s}</option>`).join('');
$('category-list').innerHTML = CATEGORIES.slice(1).map(c => `<button data-category="${c.id}">${icon(c.icon)}<span>${c.name} ↗</span></button>`).join('');
$('orbit').innerHTML = CATEGORIES.slice(1).map((c, i) => {
  const angle = (i * 60 - 90) * Math.PI / 180;
  return `<button class="orbit-tile" data-category="${c.id}" style="--i:${i};--x:${Math.cos(angle) * 185}px;--y:${Math.sin(angle) * 160}px">${icon(c.icon)}<span>${c.name}</span></button>`;
}).join('');

for (const id of ['category-list', 'orbit']) {
  $(id).addEventListener('click', e => {
    const b = e.target.closest('[data-category]');
    if (!b) return;
    if ($('sections-dialog').open) $('sections-dialog').close();
    chooseCategory(b.dataset.category);
  });
}
for (const id of ['sections-open', 'orbit-open']) $(id).onclick = () => openDialog('sections-dialog');
$('info-open').onclick = () => openDialog('info-dialog');

function renderCatalog() {
  const query = $('search').value.trim().toLowerCase();
  let products = PRODUCTS.filter(p =>
    ($('category-filter').value === 'all' || p.category === $('category-filter').value) &&
    (!$('size-filter').value || p.sizes.includes($('size-filter').value)) &&
    p.name.toLowerCase().includes(query) &&
    (!favoritesOnly || favorites.has(p.id))
  );
  const sort = $('sort').value;
  products.sort((a, b) => sort === 'low' ? a.price - b.price : sort === 'high' ? b.price - a.price : Number(b.new) - Number(a.new));

  $('catalog-title').textContent = CATEGORIES.find(c => c.id === $('category-filter').value).name.toUpperCase();
  $('result-count').textContent = `Найдено: ${products.length}`;
  $('product-grid').innerHTML = products.length
    ? products.map((p, i) => {
        // Splice the quick-view hint into visual(p)'s single wrapping <div>
        // so it's positioned against the image itself, not the whole card.
        const cardVisual = visual(p).replace('</div>', '<span class="quick-view-hint" aria-hidden="true">Быстрый просмотр ↗</span></div>');
        return `<article class="product-card" style="animation-delay:${i * .045}s"><button class="product-open" data-product="${p.id}">${cardVisual}<h3>${esc(p.name)}</h3><p>${money(p.price)} <span class="muted">/ ${esc(p.color)}</span></p></button>${p.stock === 0 ? '<span class="sold-tag">НЕТ В НАЛИЧИИ</span>' : p.new ? '<span class="new-tag">НОВИНКА</span>' : ''}<button class="favorite" data-favorite="${p.id}" aria-label="${favorites.has(p.id) ? 'Убрать из' : 'Добавить в'} избранное: ${esc(p.name)}" aria-pressed="${favorites.has(p.id)}">${favorites.has(p.id) ? '♥' : '♡'}</button></article>`;
      }).join('')
    : '<div class="empty">Ничего не нашлось. Попробуй другой размер или раздел.</div>';
}

for (const id of ['category-filter', 'size-filter', 'sort']) $(id).addEventListener('change', renderCatalog);
$('search').addEventListener('input', renderCatalog);
$('favorites-filter').onclick = () => {
  favoritesOnly = !favoritesOnly;
  $('favorites-filter').setAttribute('aria-pressed', favoritesOnly);
  renderCatalog();
};

$('product-grid').onclick = e => {
  const favoriteBtn = e.target.closest('[data-favorite]');
  const openBtn = e.target.closest('[data-product]');
  if (favoriteBtn) {
    const id = favoriteBtn.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    persist();
    renderCatalog();
    document.dispatchEvent(new CustomEvent('vr:favorites-changed'));
    document.querySelector(`[data-favorite="${id}"]`)?.focus();
  } else if (openBtn) {
    showProduct(openBtn.dataset.product);
  }
};
