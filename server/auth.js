'use strict';
/*
 * Session cookies and the login/admin guards every protected route uses.
 * Sessions are a random 32-byte token; only its SHA-256 hash is stored in
 * SQLite, so a leaked database dump doesn't hand out usable session tokens.
 */
const crypto = require('node:crypto');
const { db } = require('../db');
const { error } = require('./http-utils');

const SESSION_SECONDS = 14 * 24 * 60 * 60;
const SECURE = process.env.COOKIE_SECURE === '1';

function readSessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('vr_session='));
  return cookie ? cookie.slice('vr_session='.length) : null;
}

// Looks up the logged-in user for a request, or null when there isn't one.
// Never throws — callers that require a login call requireLogin() instead.
function requestUser(req) {
  const token = readSessionToken(req);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenhash = crypto.createHash('sha256').update(token).digest('hex');
  const row = db.prepare(
    'SELECT u.id,u.email,u.name,u.role,u.addresses FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.tokenhash=? AND s.expires_at>?'
  ).get(tokenhash, Date.now());
  return row || null;
}

function sessionCookie(token, maxAge) {
  return `vr_session=${token || ''}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}; ${SECURE ? 'Secure; ' : ''}Priority=High`;
}

// Creates a new session row for `id` and returns the Set-Cookie header value
// to send back with the response.
function loginSession(id) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenhash = crypto.createHash('sha256').update(token).digest('hex');
  db.prepare('INSERT INTO sessions(tokenhash,user_id,expires_at) VALUES (?,?,?)').run(tokenhash, id, Date.now() + SESSION_SECONDS * 1000);
  return sessionCookie(token, SESSION_SECONDS);
}

function clearSessionCookie() {
  return sessionCookie('', 0);
}

function destroySession(req) {
  const token = readSessionToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE tokenhash=?').run(crypto.createHash('sha256').update(token).digest('hex'));
}

const requireLogin = req => {
  const user = requestUser(req);
  if (!user) error(401, 'Войди в аккаунт.');
  return user;
};

const requireAdmin = req => {
  const user = requireLogin(req);
  if (user.role !== 'admin') error(403, 'Только для администратора.');
  return user;
};

module.exports = {
  SESSION_SECONDS,
  requestUser,
  requireLogin,
  requireAdmin,
  loginSession,
  clearSessionCookie,
  destroySession,
};
