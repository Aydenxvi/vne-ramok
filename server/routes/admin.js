'use strict';
/*
 * Admin-only: dashboard stats, product CRUD, order list/status, and photo
 * upload. Every route here calls requireAdmin() first.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, allProducts } = require('../../db');
const { send, error, parseJSON } = require('../http-utils');
const { requireAdmin } = require('../auth');
const { validProduct } = require('../validators');
const { ROOT } = require('../static');

const ORDER_STATUSES = ['new', 'confirmed', 'packed', 'shipped', 'completed', 'cancelled'];

const routes = [
  {
    method: 'GET',
    path: '/api/admin/summary',
    handler(req, res) {
      requireAdmin(req);
      const stats = {
        products: db.prepare('SELECT COUNT(*) n FROM products WHERE active=1').get().n,
        orders: db.prepare('SELECT COUNT(*) n FROM orders').get().n,
        newOrders: db.prepare("SELECT COUNT(*) n FROM orders WHERE status='new'").get().n,
        amount: db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='cancelled'").get().n,
      };
      send(res, 200, { stats });
    },
  },
  {
    method: 'GET',
    path: '/api/admin/products',
    handler(req, res) {
      requireAdmin(req);
      send(res, 200, { products: allProducts(true) });
    },
  },
  {
    method: 'POST',
    path: '/api/admin/products',
    handler: (req, res) => saveProduct(req, res, 'POST'),
  },
  {
    method: 'PUT',
    path: '/api/admin/products',
    handler: (req, res) => saveProduct(req, res, 'PUT'),
  },
  {
    method: 'GET',
    path: '/api/admin/orders',
    handler(req, res) {
      requireAdmin(req);
      const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 120').all();
      const itemsFor = db.prepare('SELECT product_id,name,color,size,qty,price FROM order_items WHERE order_id=?');
      send(res, 200, { orders: orders.map(o => ({ ...o, items: itemsFor.all(o.id) })) });
    },
  },
  {
    method: 'PATCH',
    path: '/api/admin/orders/status',
    async handler(req, res) {
      requireAdmin(req);
      const d = await parseJSON(req);
      if (!Number.isInteger(d.id) || !ORDER_STATUSES.includes(d.status)) error(400, 'Некорректный статус.');
      const row = db.prepare('SELECT status FROM orders WHERE id=?').get(d.id);
      if (!row) error(404, 'Заказ не найден.');
      db.exec('BEGIN IMMEDIATE');
      try {
        if (d.status === 'cancelled' && row.status !== 'cancelled') {
          const restock = db.prepare('UPDATE products SET stock=stock+? WHERE id=?');
          for (const item of db.prepare('SELECT product_id,qty FROM order_items WHERE order_id=?').all(d.id)) {
            restock.run(item.qty, item.product_id);
          }
        }
        if (row.status === 'cancelled' && d.status !== 'cancelled') error(409, 'Отменённый заказ нельзя возобновить — создай новый.');
        db.prepare('UPDATE orders SET status=? WHERE id=?').run(d.status, d.id);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      send(res, 200, { ok: true });
    },
  },
  {
    method: 'POST',
    path: '/api/admin/upload',
    async handler(req, res) {
      requireAdmin(req);
      const d = await parseJSON(req);
      if (typeof d.data !== 'string' || d.data.length > 2_800_000 || !/^data:image\/(png|jpeg|webp);base64,/i.test(d.data)) {
        error(400, 'Загрузи PNG, JPG или WEBP не более 2 МБ.');
      }
      const buffer = Buffer.from(d.data.split(',')[1], 'base64');
      if (buffer.length > 2_000_000 || buffer.length < 100) error(400, 'Изображение не подходит.');
      const isPng = buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
      const isJpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
      if (!isPng && !isJpg && !isWebp) error(400, 'Неподдерживаемый файл изображения.');
      fs.mkdirSync(path.join(ROOT, 'uploads'), { recursive: true });
      const id = crypto.randomBytes(16).toString('hex');
      const filename = id + (isPng ? '.png' : isJpg ? '.jpg' : '.webp');
      fs.writeFileSync(path.join(ROOT, 'uploads', filename), buffer, { flag: 'wx' });
      send(res, 201, { ok: true, url: '/uploads/' + filename });
    },
  },
];

async function saveProduct(req, res, method) {
  requireAdmin(req);
  const d = await parseJSON(req);
  const v = validProduct(d);
  const existing = db.prepare('SELECT id FROM products WHERE id=?').get(v.id);
  if (method === 'POST' && existing) error(409, 'ID товара уже существует.');
  if (method === 'PUT' && !existing) error(404, 'Товар не найден.');
  const data = JSON.stringify(v);
  const active = d.active === false ? 0 : 1;
  if (existing) db.prepare('UPDATE products SET data=?,stock=?,active=? WHERE id=?').run(data, d.stock, active, v.id);
  else db.prepare('INSERT INTO products(id,data,stock,active) VALUES (?,?,?,?)').run(v.id, data, d.stock, active);
  send(res, 200, { ok: true, product: v });
}

module.exports = routes;
