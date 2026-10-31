'use strict';
/*
 * Registration, login/logout, profile and favorites. Passwords are hashed
 * with scrypt (see db.js); login attempts are rate-limited per IP+email.
 */
const { db, hashPassword, verifyPassword } = require('../../db');
const { send, error, parseJSON, str, validEmail, validId } = require('../http-utils');
const { requestUser, requireLogin, loginSession, clearSessionCookie, destroySession } = require('../auth');

// IP+email -> {count, until}. In-memory only: resets on server restart, which
// is fine for a local demo and intentionally not a distributed rate limiter.
const loginAttempts = new Map();

const routes = [
  {
    method: 'GET',
    path: '/api/me',
    handler(req, res) {
      const u = requestUser(req);
      send(res, 200, { user: u ? { id: u.id, email: u.email, name: u.name, role: u.role, addresses: JSON.parse(u.addresses) } : null });
    },
  },
  {
    method: 'POST',
    path: '/api/register',
    async handler(req, res) {
      const d = await parseJSON(req);
      const email = str(d.email, 200).toLowerCase();
      const name = str(d.name, 80);
      const password = d.password;
      if (!validEmail(email) || name.length < 2 || typeof password !== 'string' || password.length < 10 || password.length > 120) {
        error(400, 'Укажи имя, email и пароль от 10 до 120 символов.');
      }
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) error(409, 'Такой email уже зарегистрирован.');
      const user = db.prepare('INSERT INTO users(email,name,passhash) VALUES (?,?,?)').run(email, name, hashPassword(password));
      send(res, 201, { ok: true, user: { name, email, role: 'customer' } }, { 'Set-Cookie': loginSession(Number(user.lastInsertRowid)) });
    },
  },
  {
    method: 'POST',
    path: '/api/login',
    async handler(req, res) {
      const d = await parseJSON(req);
      const email = str(d.email, 200).toLowerCase();
      const key = (req.socket.remoteAddress || 'unknown') + email;
      const info = loginAttempts.get(key) || { count: 0, until: 0 };
      if (info.count >= 7 && Date.now() < info.until) error(429, 'Слишком много попыток входа. Попробуй позднее.');
      const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      if (!row || typeof d.password !== 'string' || !verifyPassword(d.password, row.passhash)) {
        loginAttempts.set(key, { count: info.count + 1, until: Date.now() + 15 * 60_000 });
        error(401, 'Неправильный email или пароль.');
      }
      loginAttempts.delete(key);
      send(res, 200, { ok: true, user: { name: row.name, email: row.email, role: row.role } }, { 'Set-Cookie': loginSession(row.id) });
    },
  },
  {
    method: 'POST',
    path: '/api/logout',
    handler(req, res) {
      destroySession(req);
      send(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    },
  },
  {
    method: 'PUT',
    path: '/api/profile',
    async handler(req, res) {
      const u = requireLogin(req);
      const d = await parseJSON(req);
      const name = str(d.name, 80);
      const addresses = d.addresses;
      if (name.length < 2 || !Array.isArray(addresses) || addresses.length > 5 || addresses.some(x => typeof x !== 'string' || x.length > 250)) {
        error(400, 'Укажи имя и до пяти адресов.');
      }
      db.prepare('UPDATE users SET name=?,addresses=? WHERE id=?').run(name, JSON.stringify(addresses.map(x => x.trim()).filter(Boolean)), u.id);
      send(res, 200, { ok: true });
    },
  },
  {
    method: 'GET',
    path: '/api/favorites',
    handler(req, res) {
      const u = requireLogin(req);
      const ids = db.prepare('SELECT product_id FROM favorites WHERE user_id=?').all(u.id).map(x => x.product_id);
      send(res, 200, { favorites: ids });
    },
  },
  {
    method: 'PUT',
    path: '/api/favorites',
    async handler(req, res) {
      const u = requireLogin(req);
      const d = await parseJSON(req);
      if (!Array.isArray(d.ids) || d.ids.length > 200 || d.ids.some(x => typeof x !== 'string' || !validId(x))) {
        error(400, 'Некорректный список избранного.');
      }
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('DELETE FROM favorites WHERE user_id=?').run(u.id);
        const insert = db.prepare('INSERT INTO favorites(user_id,product_id) VALUES (?,?)');
        for (const id of new Set(d.ids)) {
          if (db.prepare('SELECT id FROM products WHERE id=?').get(id)) insert.run(u.id, id);
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      send(res, 200, { ok: true });
    },
  },
];

module.exports = routes;
