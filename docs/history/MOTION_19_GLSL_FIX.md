# VNE RAMOK 19 — GLSL shader fix

## Root cause

3D previously failed with:

```text
ERROR: 0:12: 'max': no matching overloaded function found
```

The WebGL fragment shader called `max()` with three float arguments. GLSL ES 1.00 supports `max(a, b)` — exactly two arguments. Thus shader compilation failed before a 3D canvas could be shown; the SVG fallback remained visible. This is **not** a GPU performance or browser-setting problem.

The shader expression was corrected to:

```glsl
float soft = pow(max(dot(N, normalize(vec3(-0.3, 0.5, 1.0))), 0.0), 13.0) * 0.055;
```

## Verification

- Added `tests/shaders.test.js`, a GLSL intrinsic-arity regression test. It **failed on V18** (3-argument `max`) and passes with the fix.
- Existing on-demand procedural WebGL model, outfits, cart, accounts, receipt/printer animation and admin panel preserved.
- No changes to database or APIs.
- GPU-based visual rendering still must be checked locally on the target computer, as the build environment cannot create a real WebGL context.

## Installation

### Patch onto version 18

1. Stop the server (`Ctrl+C`). Back up the project.
2. Extract `VNE_RAMOK_19_PATCH.zip` over the **root of the installed project** (same folder containing `start_windows.bat`), confirming replacements.
3. Restart `start_windows.bat`, open `http://localhost:3000`, press `Ctrl+Shift+R`.
4. Visit **СОБРАТЬ ОБРАЗ**. The badge should read `VNE 19 / 3D`; when the model renders: `3D АКТИВНО / 360°`. Rotate by dragging.
5. If a new error occurs, click `?` and provide its exact text, rather than changing browser settings blindly.

### Full install

Unpack `VNE_RAMOK_19_FULL.zip` into a *new folder*, run its `vne-ramok/start_windows.bat` and follow steps 3–5 above.

No new npm dependencies; this is a styled procedural 3D display, not a photorealistic try-on.
