'use strict';
/* No account credentials or personal contact data are persisted on public portfolio previews.
   Public preview intentionally keeps catalog + full checkout UI while disabling authentication,
   real order storage, uploads and admin APIs. Local npm start remains fully functional. */
const { error } = require('./http-utils');
const publicDemo = process.env.PUBLIC_DEMO === '1';
const hits = new Map();
function guard(req, pathname) {
  if (!publicDemo) return;
  // A public portfolio viewer must never reach any user or privileged mutation endpoint.
  const blocked = /^\/api\/(?:admin\/|register$|login$|logout$|profile$|favorites$|my-orders$)/.test(pathname);
  if (blocked) error(403, 'Публичное демо: аккаунты и админ-панель доступны только локально.');
  if (req.method === 'POST' && pathname === '/api/orders') {
    const ip = String(req.socket.remoteAddress || 'unknown');
    const now = Date.now();
    const item = hits.get(ip) || { count: 0, from: now };
    if (now - item.from > 3600000) { item.count = 0; item.from = now; }
    if (++item.count > 24) error(429, 'Слишком много демонстрационных заказов.');
    hits.set(ip, item);
    if (hits.size > 3000) for (const [key,v] of hits) if (now-v.from>3600000) hits.delete(key);
  }
}
module.exports = { publicDemo, guard };
