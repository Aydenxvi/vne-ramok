'use strict';
/*
 * Small, dependency-free HTTP helpers shared by every route module.
 * Nothing here talks to the database — it is pure request/response plumbing.
 */

// Thrown anywhere in a route handler; the top-level server catches it and turns
// it into the matching JSON error response instead of a generic 500.
class HttpError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// Shorthand for "stop here and fail the request" — reads nicely at the call site:
//   if (!ok) error(400, 'Что-то не так.');
function error(code, message) {
  throw new HttpError(code, message);
}

// Writes a JSON response. Every API response is JSON and never cached.
function send(res, code, data, extraHeaders = {}) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

// Reads and parses a JSON request body, enforcing a content-type check and a
// hard size cap (3 MB) so a client can't stream an unbounded body at us.
function parseJSON(req) {
  return new Promise((resolve, reject) => {
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
      return reject(new HttpError(415, 'Ожидается JSON.'));
    }
    let size = 0;
    const parts = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 3_000_000) {
        reject(new HttpError(413, 'Слишком большой запрос.'));
        req.destroy();
        return;
      }
      parts.push(chunk);
    });
    req.on('end', () => {
      try {
        const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
        if (!value || Array.isArray(value) || typeof value !== 'object') throw 0;
        resolve(value);
      } catch {
        reject(new HttpError(400, 'Некорректный JSON.'));
      }
    });
    req.on('error', reject);
  });
}

// Trim + length-cap a string field from untrusted JSON input. Anything that
// isn't a string becomes ''.
const str = (value, max = 250) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

const validEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;

const validId = id => /^[a-z0-9][a-z0-9_-]{1,47}$/i.test(id);

// Extension -> Content-Type for everything the static file server is allowed to serve.
const mime = {
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon',
};

module.exports = { HttpError, error, send, parseJSON, str, validEmail, validId, mime };
