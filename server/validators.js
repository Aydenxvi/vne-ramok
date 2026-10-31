'use strict';
/*
 * Input validation that touches the product catalog: cleaning up a product
 * record from the admin editor, and turning a cart's raw items into priced,
 * stock-checked order lines. Both throw HttpError (via `error`) on anything
 * that doesn't check out — the server-side price/stock math never trusts
 * what the browser sends.
 */
const { db, parseRow } = require('../db');
const { error, str, validId } = require('./http-utils');

const CATEGORIES = ['jeans', 'pants', 'hoodies', 'jackets', 'tees', 'hats'];
const CATEGORY_ICON = { jeans: 'jeans', pants: 'jeans', hoodies: 'hoodie', jackets: 'jacket', tees: 'tee', hats: 'hat' };

// Validates + normalizes a product record submitted from the admin editor.
// Returns the clean record that gets stored as the `products.data` JSON blob.
function validProduct(p) {
  if (!p || !validId(p.id)) error(400, 'ID товара: 2–48 символов (латиница, цифры, - или _).');
  if (str(p.name, 90).length < 3) error(400, 'Название товара слишком короткое.');
  if (!CATEGORIES.includes(p.category)) error(400, 'Выбери раздел товара.');
  if (!Number.isInteger(p.price) || p.price < 100 || p.price > 10_000_000) error(400, 'Цена должна быть целым числом от 100 до 10 000 000.');
  if (!Array.isArray(p.sizes) || !p.sizes.length || p.sizes.length > 15 || p.sizes.some(x => typeof x !== 'string' || x.length > 30)) {
    error(400, 'Укажи размеры товара.');
  }
  if (!Array.isArray(p.colors) || !p.colors.length || p.colors.length > 12 ||
      p.colors.some(c => typeof c.name !== 'string' || c.name.length > 40 || !/^#[\da-f]{6}$/i.test(c.hex))) {
    error(400, 'Укажи цвета и корректный HEX.');
  }
  if (p.image && !/^\/uploads\/[0-9a-f]{32}\.(webp|png|jpg)$/.test(p.image)) error(400, 'Для фотографии используй загрузку через админ-панель.');
  if (!Number.isInteger(p.stock) || p.stock < 0 || p.stock > 100000) error(400, 'Некорректный остаток.');

  const clean = {
    id: p.id,
    name: str(p.name, 90),
    category: p.category,
    price: p.price,
    sizes: [...new Set(p.sizes.map(x => str(x, 30)))],
    colors: p.colors.map(c => ({ name: str(c.name, 40), hex: c.hex })),
    color: p.colors[0].name,
    desc: str(p.desc, 1200),
    material: str(p.material, 400),
    care: str(p.care, 400),
    fit: str(p.fit, 250),
    measurements: str(p.measurements, 500),
    image: p.image || '',
    new: !!p.new,
  };
  if (!clean.image && Number.isInteger(p.photo) && p.photo >= 0 && p.photo <= 2) clean.photo = p.photo;
  if (!clean.image && clean.photo === undefined) clean.icon = CATEGORY_ICON[p.category];
  return clean;
}

// Turns the browser's cart items into priced order lines, re-reading price,
// size/color validity and stock straight from the database. Never trusts a
// price or name the client sent.
function checkedOrder(items) {
  if (!Array.isArray(items) || !items.length || items.length > 35) error(400, 'Добавь товары в сумку.');
  const lines = [];
  for (const item of items) {
    if (!item || !validId(item.id) || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 99) {
      error(400, 'Неверное количество товара.');
    }
    const row = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(item.id);
    if (!row) error(400, 'Одна из вещей больше не продаётся. Обнови корзину.');
    const p = parseRow(row);
    if (!p.sizes.includes(item.size) || !p.colors.some(c => c.name === item.color)) {
      error(400, 'Недоступен выбранный цвет или размер: ' + p.name);
    }
    lines.push({ id: p.id, name: p.name, price: p.price, size: item.size, color: item.color, qty: item.qty });
  }
  const totalsById = new Map();
  for (const line of lines) totalsById.set(line.id, (totalsById.get(line.id) || 0) + line.qty);
  for (const [id, qty] of totalsById) {
    const stock = db.prepare('SELECT stock FROM products WHERE id=?').get(id)?.stock || 0;
    if (qty > stock) error(409, 'Недостаточно товара на складе: ' + id + ' (осталось ' + stock + ').');
  }
  return lines;
}

module.exports = { validProduct, checkedOrder, CATEGORIES };
