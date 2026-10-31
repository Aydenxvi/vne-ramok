# `server/` — backend module map

`server.js` at the project root is now a thin entry point: security headers,
the same-origin/CSRF check, and dispatch to a route table. Everything else
lives here, split by concern:

| File | Responsibility |
|---|---|
| `http-utils.js` | `HttpError`, `send()`, `parseJSON()`, `str()`/`validEmail()`/`validId()`, the MIME table. No database access. |
| `auth.js` | Session cookies, `requestUser()`, `requireLogin()`, `requireAdmin()`. |
| `validators.js` | `validProduct()` (admin product form → stored record) and `checkedOrder()` (cart → priced, stock-checked order lines). Both re-check everything against the database — the browser's numbers are never trusted. |
| `static.js` | Serves the two HTML pages, root `.js`/`.css`, `/assets`, `/robots.txt` and `/uploads/<hash>.<ext>` via a narrow allow-list regex. |
| `routes/catalog.js` | `GET /api/health`, `GET /api/products`, `GET /server-catalog.js` — public, read-only. |
| `routes/account.js` | `GET /api/me`, `POST /api/register`, `POST /api/login`, `POST /api/logout`, `PUT /api/profile`, `GET/PUT /api/favorites`. |
| `routes/orders.js` | `POST /api/orders`, `GET /api/my-orders`. |
| `routes/admin.js` | `GET /api/admin/summary`, `GET/POST/PUT /api/admin/products`, `GET /api/admin/orders`, `PATCH /api/admin/orders/status`, `POST /api/admin/upload`. |

`db.js` (project root, unchanged) still owns the SQLite schema and the
password-hashing helpers; every module above requires it as `../../db` (or
`../db` from inside `server/`).

## Why this split

The original `server.js` was a single ~230-line file mixing HTTP plumbing,
auth, validation and every route. Functionally nothing changed in this
split — same endpoints, same status codes, same validation, same tests
(`npm test` covers it end-to-end via real HTTP requests against a spawned
`node server.js`) — but a new route is now "add a handler to the right file
in `routes/`" instead of "find the right spot in one long function".

## Adding a route

1. Pick (or create) the right file under `routes/`.
2. Export `{ method, path, handler(req, res, url) }` from its array.
   `handler` can be `async`; call `send(res, code, body)` to respond, or
   `error(code, message)` (from `http-utils`) to fail with a JSON error.
3. `server.js` picks it up automatically — nothing else to wire.
