'use strict';
/*
 * Public, read-only catalog endpoints — no login required. Also serves
 * /server-catalog.js, the dynamic replacement for the static products.js
 * fallback that file://-mode browsing uses, so that `npm start` always
 * reflects the live database instead of the baked-in demo list.
 */
const { allProducts } = require('../../db');
const { send, mime } = require('../http-utils');
const { publicDemo } = require('../public-demo');

const routes = [
  {
    method: 'GET',
    path: '/server-catalog.js',
    handler(req, res) {
      const json = JSON.stringify(allProducts());
      res.writeHead(200, { 'Content-Type': mime['.js'], 'Cache-Control': 'no-store' });
      res.end('window.VR_SERVER_MODE=true;window.VR_PUBLIC_DEMO='+publicDemo+';window.PRODUCTS=' + json.replace(/</g, '\\u003c') + ';');
    },
  },
  {
    method: 'GET',
    path: '/api/health',
    handler(req, res) {
      send(res, 200, { ok: true, mode: publicDemo ? 'public-demo' : 'local-development', payments: 'not-connected' });
    },
  },
  {
    method: 'GET',
    path: '/api/products',
    handler(req, res) {
      send(res, 200, { products: allProducts() });
    },
  },
];

module.exports = routes;
