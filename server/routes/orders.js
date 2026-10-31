'use strict';
/*
 * Checkout (POST /api/orders) and a customer's own order history. Price,
 * discount and shipping fee are always computed here from the database —
 * never taken from the request — and stock is deducted inside the same
 * transaction that creates the order row.
 */
const crypto = require('node:crypto');
const { db } = require('../../db');
const { send, error, parseJSON, str, validEmail } = require('../http-utils');
const { requestUser, requireLogin } = require('../auth');
const { checkedOrder } = require('../validators');
const { publicDemo } = require('../public-demo');

const routes = [
  {
    method: 'POST',
    path: '/api/orders',
    async handler(req, res) {
      const d = await parseJSON(req);
      const user = requestUser(req);
      const name = str(d.name, 80);
      const email = str(d.email, 200).toLowerCase();
      const address = str(d.address, 350);
      const notes = str(d.notes, 500);
      const shipping = d.shipping;
      if (name.length < 2 || !validEmail(email) || address.length < 8) error(400, 'Заполни имя, email и адрес доставки.');
      if (!['standard', 'express'].includes(shipping)) error(400, 'Выбери способ доставки.');
      if (d.agree !== true) error(400, 'Подтверди согласие на обработку данных для заявки.');

      // Public portfolio mode validates real catalog products and prices but never
      // writes a visitor's name, email or address to disk or modifies stock.
      if (publicDemo) {
        const lines = checkedOrder(d.items);
        const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0);
        const discount = str(d.promo, 30).toUpperCase() === 'VNE10' ? Math.round(subtotal * .1) : 0;
        const fee = shipping === 'express' ? 890 : (subtotal - discount >= 12000 ? 0 : 390);
        return send(res, 201, { ok: true, order: {
          code: 'DEMO-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          subtotal, discount, shipping_fee: fee, total: subtotal-discount+fee,
          status: 'preview', payment_status: 'not_connected', saved: false
        }});
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        const lines = checkedOrder(d.items);
        const subtotal = lines.reduce((t, l) => t + l.price * l.qty, 0);
        const discount = str(d.promo, 30).toUpperCase() === 'VNE10' ? Math.round(subtotal * 0.1) : 0;
        const fee = shipping === 'express' ? 890 : (subtotal - discount >= 12000 ? 0 : 390);
        const total = subtotal - discount + fee;
        const code = 'VR-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        const order = db.prepare(
          'INSERT INTO orders(code,user_id,contact_name,contact_email,address,shipping,subtotal,discount,shipping_fee,total,status,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        ).run(code, user?.id || null, name, email, address, shipping, subtotal, discount, fee, total, 'new', notes);

        const addItem = db.prepare('INSERT INTO order_items(order_id,product_id,name,color,size,qty,price) VALUES (?,?,?,?,?,?,?)');
        const deductStock = db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?');
        for (const line of lines) addItem.run(order.lastInsertRowid, line.id, line.name, line.color, line.size, line.qty, line.price);

        const qtyById = new Map();
        for (const line of lines) qtyById.set(line.id, (qtyById.get(line.id) || 0) + line.qty);
        for (const [id, qty] of qtyById) {
          if (deductStock.run(qty, id, qty).changes !== 1) error(409, 'Недостаточный остаток товара: ' + id);
        }

        db.exec('COMMIT');
        send(res, 201, { ok: true, order: { code, subtotal, discount, shipping_fee: fee, total, status: 'new', payment_status: 'not_connected' } });
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  },
  {
    method: 'GET',
    path: '/api/my-orders',
    handler(req, res) {
      const u = requireLogin(req);
      const orders = db.prepare(
        'SELECT code,shipping,subtotal,discount,shipping_fee,total,status,payment_status,created_at FROM orders WHERE user_id=? ORDER BY id DESC LIMIT 40'
      ).all(u.id);
      send(res, 200, { orders });
    },
  },
];

module.exports = routes;
