'use strict';
/*
 * Serves the handful of static files the storefront needs: the two HTML
 * pages, the browser scripts/styles at the project root, /assets, /robots.txt
 * and uploaded product photos under /uploads. Everything else is a 404 —
 * the allow-list regex below is deliberately narrow instead of trying to
 * blocklist traversal tricks.
 */
const fs = require('node:fs');
const path = require('node:path');
const { error, mime } = require('./http-utils');

const ROOT = path.resolve(__dirname, '..');

const ALLOWED_PATH = /^\/(?:index\.html|admin\.html|[a-z0-9_-]+\.(?:js|css)|robots\.txt|assets\/[a-z0-9_./-]+|uploads\/[0-9a-f]{32}\.(?:webp|png|jpg))$/i;

function staticFile(req, res, pathname) {
  const target = pathname === '/' ? '/index.html' : pathname;
  if (!ALLOWED_PATH.test(target) || target.includes('..')) return error(404, 'Файл не найден.');
  const file = path.resolve(ROOT, '.' + target);
  if (!file.startsWith(ROOT + path.sep)) error(404, 'Файл не найден.');
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return error(404, 'Файл не найден.');
  }
  if (!stat.isFile() || !mime[path.extname(file)]) error(404, 'Файл не найден.');
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file)],
    'Cache-Control': /\.html$|\.js$|\.css$/.test(file) ? 'no-cache' : 'public, max-age=86400',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

module.exports = { staticFile, ROOT };
