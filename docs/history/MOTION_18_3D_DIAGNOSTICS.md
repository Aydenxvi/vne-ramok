# VNE RAMOK 18 — 3D Studio Fix

## What changed

- Removed the 3D status pill from the clipped scroll area and pinned it to the viewport *only while the Outfit Studio is visible*.
- Added robust viewport detection, alongside the existing lazy IntersectionObserver startup.
- A `?` control shows whether the 3D module loaded and the last WebGL error.
- Preserved mouse/touch orbit controls and on-demand rendering with no perpetual frame loop.
- Improved recovery from a lost WebGL context and a failed first mesh upload.
- Cache-busted the 3D scripts/styles with `?v=18` and labeled the Windows startup console.
- No changes to the checkout, receipts, data model, admin panel, or inventory logic.

## How to confirm you're running version 18

1. Close the old server using **Ctrl+C**. When using the FULL ZIP, extract to a *new folder*.
2. Start the `start_windows.bat` **from that folder**. It prints `VNE RAMOK / VERSION 18`.
3. Open `http://localhost:3000` in Edge/Chrome and hit `Ctrl+Shift+R`.
4. Open **СОБРАТЬ ОБРАЗ**. A small pinned badge should say **VNE 18 / 3D**.
5. A **3D АКТИВНО / 360°** status means 3D rendered and can rotate by dragging.
6. If it says **WEBGL НЕДОСТУПЕН**, hit `?` for details; turn on Edge/Chrome's graphics acceleration, restart browser, and press **ЗАПУСТИТЬ 3D**.
7. If the badge is **missing**, you're probably running an older version, or some browser scripts failed to load. Check `F12 → Console` for errors.

## Known limitations

- WebGL rendering depends on browser and GPU/driver settings; failed initialization preserves the 2D SVG for accessibility.
- The 3D model is stylised procedural geometry, not a physically simulated garment or a realistic try-on.
- Automated tests validate the renderer's API and geometry; the GPU rendering on each user's PC cannot be verified here.
