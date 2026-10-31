'use strict';
/*
 * The product dialog: gallery (with honest photo/sketch labelling and a
 * zoom/pan mode), color + size selection, add-to-cart, and "wear it with"
 * related items. Depends on shared.js having already run.
 */

// Product-dialog gallery: real photo crops (honest) plus, for jeans/pants, a
// genuine fabric-detail crop from the same campaign photo. Never fabricates a
// view that doesn't exist in the assets — sketch-only products just get
// their one concept icon.
function galleryViews(p) {
  if (p.image) return [{ kind: 'custom', image: p.image, label: 'Фотография товара' }];
  if (p.photo !== undefined) {
    const views = [{ kind: 'photo', panel: p.photo, label: 'Фото образа' }];
    if (p.category === 'jeans' || p.category === 'pants') views.push({ kind: 'photo', panel: 2, label: 'Деталь: плотный деним (образец ткани)' });
    return views;
  }
  return [{ kind: 'icon', icon: p.icon, label: 'Эскиз (концепт)' }];
}

function galleryCropHTML(view, colorHex) {
  if (view.kind === 'custom') return `<div class="gallery-crop custom-photo"><img src="${esc(view.image)}" alt=""></div>`;
  if (view.kind === 'photo') return `<div class="gallery-crop" style="--panel:${view.panel}"><img src="assets/campaign.webp" alt=""></div>`;
  return `<div class="gallery-crop drawing" style="color:${esc(colorHex)}">${icon(view.icon)}</div>`;
}

let galleryIndex = 0, selectedColorIndex = 0, galleryBaseLabel = '', galleryPan = { x: 0, y: 0 };

function renderGalleryMain() {
  const p = selectedProduct;
  if (!p) return;
  const views = galleryViews(p);
  const view = views[galleryIndex] || views[0];
  const color = VRCart.colorsOf(p)[selectedColorIndex];
  const layer = $('gallery-zoomlayer');
  // Crossfade: swap the old crop out and the new one in rather than an
  // instant replace, so switching color/view reads as a transition.
  const swap = () => {
    layer.innerHTML = galleryCropHTML(view, color.hex);
    layer.classList.remove('crossfade-out', 'crossfade-in');
    void layer.offsetWidth;
    layer.classList.add('crossfade-in');
  };
  if (reduced.matches || !layer.firstChild) swap();
  else {
    layer.classList.add('crossfade-out');
    setTimeout(swap, 120);
  }
  galleryBaseLabel = `${p.name} — ${view.label}`;
  const note = $('gallery-note');
  if (note) {
    note.textContent = view.kind === 'custom'
      ? 'Фотография добавлена через админ-панель.'
      : view.kind === 'photo'
        ? (selectedColorIndex > 0 ? `Фото показывает демо-цвет «${VRCart.colorsOf(p)[0].name}». Остальные цвета — ориентировочные образцы, не влияют на фотографию.` : 'Фото — демонстрационное изображение концепции, не финальная фотография товара.')
        : 'Эскиз — демонстрационная концепция, не финальный продукт.';
  }
  setGalleryZoom(false);
}

function setGalleryZoom(on) {
  const main = $('gallery-main'), btn = $('gallery-zoom-btn');
  if (!main) return;
  const wasOn = main.classList.contains('zoomed');
  main.classList.toggle('zoomed', on);
  btn.setAttribute('aria-pressed', on);
  btn.textContent = on ? 'Уменьшить ⊖' : 'Увеличить ⊕';
  main.tabIndex = on ? 0 : -1;
  main.setAttribute('aria-label', on ? `${galleryBaseLabel}. Увеличено — стрелки для панорамирования, Esc для выхода.` : galleryBaseLabel);
  galleryPan = { x: 0, y: 0 };
  $('gallery-zoomlayer').style.setProperty('--pan-x', '0px');
  $('gallery-zoomlayer').style.setProperty('--pan-y', '0px');
  if (on) main.focus();
  else if (wasOn) btn.focus();
}

let selectedProduct = null, selectedSize = null;

function showProduct(id) {
  const p = find(id);
  selectedProduct = p; selectedSize = null; galleryIndex = 0; selectedColorIndex = 0;
  const views = galleryViews(p), colors = VRCart.colorsOf(p);
  const galleryHTML = `<div class="gallery"><div class="gallery-main" id="gallery-main" tabindex="-1"><div class="gallery-zoomlayer" id="gallery-zoomlayer"></div></div><button type="button" class="gallery-zoom" id="gallery-zoom-btn" aria-pressed="false">Увеличить ⊕</button>${views.length > 1 ? `<div class="gallery-thumbs" role="tablist" aria-label="Изображения товара">${views.map((v, i) => `<button type="button" class="gallery-thumb" data-view="${i}" role="tab" aria-selected="${i === 0}" aria-label="${esc(v.label)}">${galleryCropHTML(v, colors[0].hex)}</button>`).join('')}</div>` : ''}<p class="muted gallery-note" id="gallery-note"></p></div>`;
  $('product-detail').innerHTML = `<div class="product-editorial"><span>VNE / PRODUCT FILE ${String(PRODUCTS.indexOf(p) + 1).padStart(3, '0')}</span><span>EVERYDAY / EVERYWHERE</span></div><div class="detail">${galleryHTML}<div class="detail-panel"><div class="eyebrow">VNE RAMOK / ${p.category.toUpperCase()} · DROP 001</div><h2 id="product-title">${esc(p.name)}</h2><p class="price">${money(p.price)}</p><p class="detail-description">${esc(p.desc || 'Свободный стиль вне рамок.')}</p><div class="detail-stock"><span class="stock-pulse"></span>${p.stock === undefined ? 'Демо-товар · наличие уточняется' : p.stock > 0 ? `В наличии: ${p.stock} шт.` : 'Нет в наличии'}</div><div class="detail-step">01 / ЦВЕТ <span>↘</span></div><div class="colors" role="group" aria-label="Цвет">${colors.map((c, i) => `<button type="button" data-color-idx="${i}" aria-pressed="${i === 0}"><span class="swatch" style="--sw:${esc(c.hex)}"></span>${esc(c.name)}</button>`).join('')}</div><div class="detail-step">02 / РАЗМЕР <button type="button" id="size-help">ГИД ПО РАЗМЕРАМ ↗</button></div><div class="sizes">${p.sizes.map(s => `<button type="button" data-size="${esc(s)}" aria-pressed="false">${esc(s)}</button>`).join('')}</div><button id="add-cart" class="primary" ${p.stock === 0 ? 'disabled' : ''} disabled>${p.stock === 0 ? 'НЕТ В НАЛИЧИИ' : 'ВЫБЕРИ РАЗМЕР'} <span>↗</span></button><p class="detail-help">${p.fit ? esc(p.fit) : 'Фит: свободная посадка (дизайн-концепт, точные замеры уточняются).'}</p><details id="size-guide"><summary>Размерная сетка ↗</summary><p>${p.measurements ? esc(p.measurements) : `Доступные размеры: ${p.sizes.map(esc).join(', ')}. Точные замеры в сантиметрах пока не указаны.`}</p></details><details><summary>Материал и уход ↗</summary><p>${p.material ? esc(p.material) : 'Характеристики материала появятся после подтверждения поставщиком.'} ${p.care ? esc(p.care) : 'Рекомендации по уходу уточняются.'}</p></details><details><summary>Доставка и возврат ↗</summary><p>В серверном демо доступны стандартная и экспресс-доставка по условным тарифам. Реальные сроки, стоимость и условия возврата необходимо опубликовать до запуска продаж.</p></details><div class="detail-related"><div class="eyebrow">СОЧЕТАЙ С ДРУГИМИ ВЕЩАМИ</div>${PRODUCTS.filter(x => x.id !== p.id && x.category !== p.category).slice(0, 3).map(x => `<button data-related="${esc(x.id)}">${esc(x.name)} <span>↗</span></button>`).join('')}</div></div></div>`;
  renderGalleryMain();
  openDialog('product-dialog');
}

$('product-detail').onclick = e => {
  const sizeBtn = e.target.closest('[data-size]');
  if (sizeBtn) {
    selectedSize = sizeBtn.dataset.size;
    document.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', b === sizeBtn));
    $('add-cart').disabled = selectedProduct.stock === 0;
    $('add-cart').innerHTML = 'ДОБАВИТЬ В СУМКУ <span>↗</span>';
  }
  const colorBtn = e.target.closest('[data-color-idx]');
  if (colorBtn) {
    selectedColorIndex = +colorBtn.dataset.colorIdx;
    document.querySelectorAll('[data-color-idx]').forEach(b => b.setAttribute('aria-pressed', b === colorBtn));
    renderGalleryMain();
  }
  const viewBtn = e.target.closest('[data-view]');
  if (viewBtn) {
    galleryIndex = +viewBtn.dataset.view;
    document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', b === viewBtn));
    renderGalleryMain();
  }
  if (e.target.closest('#size-help')) {
    $('size-guide').open = true;
    $('size-guide').scrollIntoView({ block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth' });
  }
  const related = e.target.closest('[data-related]');
  if (related) { $('product-dialog').close(); showProduct(related.dataset.related); return; }
  if (e.target.closest('#gallery-zoom-btn')) setGalleryZoom(!$('gallery-main').classList.contains('zoomed'));
  if (e.target.closest('#add-cart') && selectedSize) {
    const colorName = VRCart.colorsOf(selectedProduct)[selectedColorIndex].name;
    const result = VRCart.addToCart(cart, selectedProduct.id, colorName, selectedSize);
    if (result.capped) { toast('Максимум 99 единиц'); return; }
    count();
    toast('Вещь добавлена в сумку');
    flyToCart(e.target.closest('#add-cart'));
    $('product-dialog').close();
  }
};

$('product-detail').addEventListener('keydown', e => {
  const main = $('gallery-main');
  if (!main || e.target !== main || !main.classList.contains('zoomed')) return;
  // Escape is handled by the dialog's own 'cancel' listener below — a child
  // keydown handler can't preventDefault() a <dialog>'s native Escape-to-close,
  // since that's driven by the separate 'cancel' event, not by this keydown bubbling.
  if (e.key === 'Escape') return;
  const step = 28;
  let moved = true;
  if (e.key === 'ArrowLeft') galleryPan.x += step;
  else if (e.key === 'ArrowRight') galleryPan.x -= step;
  else if (e.key === 'ArrowUp') galleryPan.y += step;
  else if (e.key === 'ArrowDown') galleryPan.y -= step;
  else moved = false;
  if (moved) {
    e.preventDefault();
    $('gallery-zoomlayer').style.setProperty('--pan-x', galleryPan.x + 'px');
    $('gallery-zoomlayer').style.setProperty('--pan-y', galleryPan.y + 'px');
  }
});

// Escape on a modal <dialog> fires a cancelable 'cancel' event before it
// closes; intercept it while the gallery is zoomed so the first Escape only
// zooms out, and only a second Escape (gallery no longer zoomed) actually
// closes the product dialog.
$('product-dialog').addEventListener('cancel', e => {
  const main = $('gallery-main');
  if (main && main.classList.contains('zoomed')) { e.preventDefault(); setGalleryZoom(false); }
});
