'use strict';
/*
 * VNE RAMOK local order-management server; no payment gateway and no email
 * delivery. Do not expose directly to the public internet. Use HTTPS,
 * external auditing and a hosted payment provider before operating as a
 * live commerce service.
 *
 * This file only wires things together: security headers, the same-origin
 * check, and dispatch to a route table assembled from server/routes/*.js.
 * The actual logic — auth, validation, the handlers themselves — lives in
 * server/ (see server/README.md for the map).
 */
const http = require('node:http');
const { HttpError, error, send } = require('./server/http-utils');
const { staticFile } = require('./server/static');
const { publicDemo, guard } = require('./server/public-demo');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

// Every route module exports an array of {method, path, handler}. Collecting
// them into one Map at startup keeps request dispatch a single lookup.
const routeModules = [
  require('./server/routes/catalog'),
  require('./server/routes/account'),
  require('./server/routes/orders'),
  require('./server/routes/admin'),
];
const routes = new Map();
for (const mod of routeModules) {
  for (const route of mod) routes.set(route.method + ' ' + route.path, route.handler);
}

const ALLOWED_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

async function handler(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (!ALLOWED_METHODS.has(req.method)) error(405, 'Метод не поддерживается.');

  // Cross-site form submission protection in addition to SameSite cookies.
  // Local dev accepts only requests sent from the same origin as the page.
  if (!['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
      error(403, 'Некорректный источник запроса.');
    }
    if (req.headers['sec-fetch-site'] === 'cross-site') error(403, 'Межсайтовый запрос заблокирован.');
  }

  guard(req, pathname);
  if (publicDemo && pathname === '/admin.html') error(404,'Панель администратора недоступна в публичной демоверсии.');
  const route = routes.get(req.method + ' ' + pathname);
  if (route) return route(req, res, url);

  if (pathname.startsWith('/api/')) error(404, 'API-метод не найден.');
  if (['GET', 'HEAD'].includes(req.method)) return staticFile(req, res, pathname);
  error(405, 'Метод не поддерживается.');
}

http.createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch(e => {
    if (res.headersSent) { res.destroy(); return; }
    if (!(e instanceof HttpError)) console.error('[server]', e);
    send(res, e.code || 500, { error: e instanceof HttpError ? e.message : 'Ошибка сервера. Попробуй ещё раз.' });
  });
}).listen(PORT, HOST, () => {
  console.log(`VNE RAMOK 26 / ${publicDemo?'PUBLIC PORTFOLIO DEMO':'LOCAL FULL BACKEND'}: http://${HOST}:${PORT}\nPayments: NOT CONNECTED. ${publicDemo?'No customer data/orders stored.':'Orders stored in local SQLite.'}`);
});
