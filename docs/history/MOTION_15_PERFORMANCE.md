# MOTION 15 — Performance Edition

A targeted performance pass on top of the **complete MOTION 14 project**
(including Claude's MOTION 10–13 work and the restored demo receipt printer).

## What changed

- **Energy lines:** the embedded SVG files no longer repaint blurred, animated stroke-dashes on every frame. The CSS masked background highlights no longer animate `background-position` across large surfaces. A subtle opacity pulse keeps the premium look.
- **New Drop:** replaced an animated large `drop-shadow()` filter with compositable opacity. Hidden stacked cards no longer run redundant reflection animations.
- **Scroll animations:** removed `filter: blur()` from animated large text and reveal sections; retained fade-and-translate entrances.
- **Idle animations:** an `IntersectionObserver` pauses infinite CSS animations more than ~250px outside the viewport. Opening a dialog pauses the site behind it. Switching away from the browser tab pauses decorative motion. Animations resume on return.
- **High-frequency gaming mouse:** pointer-following CSS updates for the metal pill, magnetic buttons, DROP PASS and product card tilt now run at most once per `requestAnimationFrame`, rather than for every pointer event.
- **Glints:** only selected CTAs receive automatic looping gloss; other buttons retain their hover/focus shine.
- **User control:** footer button toggles **ЭФФЕКТЫ: ПЛАВНЫЕ / ЭКО**. Eco mode stops decorative loops while keeping the functional interactions, transitions and checkout receipt. The choice is saved locally when storage is available.

## How to run

Double-click `start_windows.bat` on Windows (requires Node 22.13+); open http://localhost:3000 in the same computer. Close any older VNE RAMOK server using port 3000 first. Do not overwrite an existing project without backing up its `data` and `uploads` folders.

## How to test

1. Scroll from the hero through the drop, lookbook, outfit studio, catalog and footer. Notice that the energetic accents still pulse but inactive sections no longer spend time animating.
2. Move the pointer over a product image, metallic button and DROP PASS to verify interactive motion.
3. Toggle **ЭФФЕКТЫ** in the footer to compare normal and Eco modes.
4. Add a product to cart, fill the demo checkout, submit, and verify that the receipt still prints and can be replayed. Payments remain disconnected.
5. Run `npm test`. Source and server tests are separate from a frame-time benchmark.

## Verification status

- Node syntax checks on JavaScript files: passed.
- Node unit/integration test suite: 42 passed (33 unit + 9 server).
- Chromium DOM smoke check with local assets injected inline: storefront initializes without console exceptions; product dialog, one-line cart, checkout and receipt/replay work; footer quality toggle updates correctly.
- **Limitations:** the execution environment blocks normal browser navigation to `http://127.0.0.1` and `file://`; therefore a real-world CPU/GPU FPS benchmark and full photo-accurate visual check could not be completed here. Performance improvements are grounded in removal of expensive paint patterns, not an invented FPS number.

Use Chrome DevTools → Performance on your Windows laptop to compare actual frame times before/after. Other factors (GPU hardware acceleration, browser extensions and power settings) can also affect perceived stutter.
