# VNE RAMOK 20 — Ready-made GLB Fashion Studio

This version integrates the seven user-provided Sketchfab GLB files with a small local WebGL renderer (`outfit-glb.js`). No third-party JS library or network CDN is needed; all GLBs are served from `assets/wardrobe-3d`.

## What's new
- GLB-based body, T-shirt, hoodie, bomber jacket, two jeans/trouser models, beanie.
- Lazy-fetches only currently selected models, then caches them per session.
- Reads the embedded glTF scene hierarchy, geometry, normals, UVs, and base-color images. Orbit remains interactive.
- Changes colors using the existing builder selections; no changes to order, basket, or checkout behavior.
- Old procedural WebGL renderer remains a fallback for unsupported WebGL. Server now serves `.glb` with correct `model/gltf-binary` MIME.
- On-screen **VNE 20 / GLB** status, author credits at `assets/wardrobe-3d/credits.html`.

## Important limitations
- These seven models were produced by different authors, with incompatible origins, pose, scale and non-rigged geometry. They are auto-positioned **approximately** and may clip or float in certain combinations. This is an outfit **visualizer**, not a scan, a rigged fit, a size recommendation, or a physically accurate virtual try-on.
- Depending on the chosen outfit, source geometry and textures can total 15–30 MB; loading is deferred until the builder is visible, with no infinite render loop. Models are not yet mesh-decimated or texture-compressed.
- The browser graphics environment available during development did not permit a live WebGL rendering test. GLB parsing and compatibility tests pass, but verify the finished scene on your own Windows computer. If a GLB load fails, use `?` in the outfit diagnostic box and check the console/network panel.
- Model licenses are **CC BY 4.0**: keep the credits in all redistributed copies. Original file attribution metadata is retained.

## Run on Windows
1. Unzip `VNE_RAMOK_20_FULL.zip` into a new folder.
2. Open `vne-ramok` and double click `start_windows.bat` (Node.js >=22.13 required).
3. Open `http://localhost:3000`, go to **СОБРАТЬ ОБРАЗ**, wait for the selected GLB files to load.
4. If installing `VNE_RAMOK_20_PATCH.zip`, copy its contents into the **existing** `vne-ramok` folder with replacement. Do not run the patch folder by itself. Keep your existing `data/` directory.

## Credits
View [3D asset attribution](assets/wardrobe-3d/credits.html). Sources all included CC BY 4.0 license metadata.
