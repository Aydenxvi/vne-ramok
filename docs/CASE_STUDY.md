# Case study — VNE RAMOK

**A full-stack, hand-built fashion e-commerce demo: editorial motion design, a real Node.js/SQLite backend, and zero runtime dependencies.**

This is a portfolio project, not a live store. It exists to show how I approach a
full product surface — frontend motion and interaction design, a small but real
backend, accessibility, mobile layout, and the discipline to refactor and document
a codebase once it's "done" — rather than to sell anything.

## The brief

Build and then substantially evolve a premium streetwear storefront: catalog,
product detail with gallery and size/color selection, a cart and demo checkout,
accounts, an admin back office, a "Lookbook" with clickable outfit hotspots, and
an "Outfit Studio" that lets a visitor assemble a look from separate garments.
The brand direction was explicit — bold brutalist type, off-white/stone and
deep-black with a restrained lime accent, cinematic but clean — and explicitly
*not* generic AI-template aesthetics, neon, glassmorphism, or clutter.

Later passes pushed it further: a full motion/interaction polish on every
screen (including the admin panel), a systematic mobile audit at five
breakpoints, and a refactor from a handful of monolithic files into a
maintainable module structure — without ever breaking the test suite or the
working application underneath it.

## What I actually built

- **A frontend with no framework and no bundler.** Six focused modules
  (`shared.js`, `catalog.js`, `product-detail.js`, `cart-panel.js`,
  `drop-stack.js`, `bridge.js`) replace what was one tangled file, loaded as
  classic scripts that share state the way pre-ES-module JavaScript always
  has — plus an explicit `window.VRStore` bridge as the documented surface
  for anything new. No React, no build step, no JS framework: every
  animation, every modal, every cart update is plain DOM work.
- **A real backend**, not a mock. Node.js's built-in `node:sqlite` (zero
  npm dependencies), scrypt-hashed passwords, HttpOnly/SameSite session
  cookies, server-recomputed pricing and stock on every order (the client is
  never trusted for money math), and an admin role with its own guarded
  routes. The route handlers are split by concern (`server/routes/*.js`) and
  covered by integration tests that spawn the real server over HTTP.
- **Motion that's accessible by construction.** Scroll reveals, kinetic
  type, a 3D product-card tilt, crossfading gallery swaps, a fly-to-cart
  flourish, and a cart drawer all built from plain CSS transitions/animations
  and `IntersectionObserver` — no animation library. Every bit of it is
  gated behind `prefers-reduced-motion`, and the hover-only effects are
  gated behind `(hover: hover) and (pointer: fine)` so touch devices never
  pay for — or get stuck with — a desktop-only interaction.
- **A genuine mobile pass**, not a assumption. I audited the storefront with
  a scripted Playwright sweep across 360/390/541/768/1024/1440px, which
  caught two real bugs no amount of "it looks fine on my screen" would have
  found (see below) — and fixed both.
- **Tests that mean something.** 30 unit tests cover cart math, the demo
  payment state machine, checkout validation, and the outfit-builder logic,
  with a small VM-based harness that reproduces the app's own classic-script
  global-sharing instead of mocking it away. 9 integration tests spawn
  `node server.js` for real and exercise it over HTTP — registration,
  favorites, order pricing, admin auth, stock restock on cancellation, photo
  upload validation, static-file path safety.

## Two bugs that only showed up under real testing

Both of these were found by actually running the app with Playwright, not by
reading the code — which is the point of keeping that kind of QA in the loop
even on a demo project.

1. **The cart drawer was rendering at all times, on every page, before it
   was ever opened.** A MOTION-11 CSS rule set `display: flex` directly on
   `#cart-dialog`'s id selector, which — by specificity — overrode the
   browser's own `dialog:not([open]) { display: none }` rule. The drawer sat
   permanently on the right edge of the viewport (full width on phones),
   silently blocking clicks under it, from the very first page load. Fixed
   by scoping the rule to `#cart-dialog[open]`.
2. **The header nav was inconsistent across tablet widths** because its
   responsive rules had accumulated, unconsolidated, across three different
   stylesheets from three different work passes. The catalog link vanished
   entirely below 800px while a secondary link stayed visible, and the
   Lookbook/Outfit-Studio links had two different, non-matching hide
   thresholds — which in turn exposed a genuine ~20px horizontal-overflow
   gap once I made them consistent. Consolidated to one breakpoint, verified
   with a scripted sweep across 13 widths from 360 to 1440px.

## Technical decisions worth calling out

- **Zero runtime dependencies, on purpose.** Everything here — the motion
  system, the backend, the test runner — is built on what Node and the
  browser already ship. That's a deliberate constraint for a portfolio
  piece: it shows the underlying skills (DOM APIs, CSS, HTTP, SQL) rather
  than familiarity with a particular framework's abstractions over them.
- **Server-side price authority.** The cart the client sends is a list of
  product/size/color/qty tuples; the server re-looks-up every price and
  stock level before an order is accepted. Nothing about the total is ever
  trusted from the browser.
- **Honest demo boundaries, stated in the UI.** The checkout clearly marks
  itself as a request, not a paid order ("payment not connected"); stock
  deductions, order statuses and the admin inbox are real, but there's no
  payment gateway behind any of it, and the README says so instead of
  implying otherwise.

## What this project is not

It's not a production storefront. Payments, shipping integration, per-SKU
(size × color) inventory, transactional email, legal/privacy pages and a
hardened deployment are all explicitly out of scope and listed as such in
the main [README](../README.md#что-сознательно-не-сделано) (in Russian —
"What's intentionally not here"). The goal was
depth on the parts a demo *can* show honestly — interaction design, a real
backend, accessibility, mobile correctness, and a codebase someone else
could actually maintain — not a checklist of every feature a real shop
would eventually need.
