# MOTION 14 — restored animated receipt

The original `printer` / `receipt` animation was removed when checkout changed from a visual payment mock-up to server-connected order submission (MOTION 09). This update restores the printer effect without replacing the connected checkout.

* New `receipt.js`: safe receipt markup and demo disclaimers.
* Updated `index.html`, `storefront.js`, `commerce.css`: animated paper print after a successful request, replay button, accessible reduced-motion fallback.
* Updated `server/routes/orders.js`: returns authoritative order subtotal, discount and shipping fee to the client for receipt display.
* Tests cover receipt content and XSS escaping.

The receipt is a **non-fiscal demonstration**. No real payments are made. On a local Node server, submission saves the request and a receipt prints; in file-preview mode the effect works but the order is not saved. Errors do not produce a receipt.

Run `start_windows.bat` in Windows, or `npm start` with Node.js 22.13+, then open http://localhost:3000. This project zip intentionally excludes data/ and uploaded private images to avoid shipping local user data; **keep your original `data/` folder** when copying the updated code into your existing installation.
