# VNE RAMOK 21 — Outfit Studio Fit Corrections

This is a targeted fix for the misaligned ready-made GLB meshes visible in the VNE RAMOK 20 screenshots. It is **not** a replacement for fully compatible, rigged clothing models.

## Changed
- The separately modeled source hands no longer protrude at their original lower A-pose coordinates when long-sleeve garments are selected. A second body pass displays only wrist/hand portions shifted near the hoodie or bomber cuffs. For short sleeves, bare arms follow their original pose.
- The beanie's four decorative goggle meshes are hidden; the cap shell is lifted above the eyebrows and slightly narrowed. No GLB source file is overwritten.
- The camera starts approximately 14% farther away, leaving more room for the full outfit in the viewport. Orbit and zoom controls remain available.
- Version labels, asset cache-busting and diagnostics updated to **VNE 21 / FIT**.
- New fit regression tests. All existing commerce flows and the animated receipt remain unchanged.

## Limitations
- The provided male body and clothes were modeled by different authors with different arm poses; offsets and clipping are approximate, not skeletal retargeting, tailoring or physically accurate cloth simulation.
- At extreme camera angles, some gaps or intersections can still appear. A proper production-grade virtual fitting room would need a unified A-pose/T-pose rig and meshes fitted to it.
- The development environment can parse all models but does not provide a usable WebGL graphics context for screenshot validation. Please check the visual fit in Chrome/Edge on the target machine. If a gap persists, screenshots of front, side and rear views would help calibrate offsets.

## Install
- **FULL:** unzip `VNE_RAMOK_21_FULL.zip`, open `vne-ramok`, run `start_windows.bat` and visit `http://localhost:3000`.
- **PATCH:** back up your existing project, stop the old server, unpack `VNE_RAMOK_21_PATCH.zip`, copy its files into the running project's root, overwrite and restart `start_windows.bat`. Do **not** run PATCH as a standalone website. Local SQLite `data/` and admin accounts are not in the patch.
- Hard reload Chrome/Edge (`Ctrl+Shift+R`); the studio indicator should read `VNE 21 / FIT`.

Credits remain in `assets/wardrobe-3d/credits.html`; the original CC BY 4.0 licensed GLBs are unchanged.
