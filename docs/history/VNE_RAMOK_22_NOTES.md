# VNE RAMOK 22 — GLB Recovery

The status badge now explicitly distinguishes **real GLB** from **simplified procedural fallback**. Click `?` to see the reason when GLB initialization fails.

- Try WebGL1 first (matching GLSL ES 1.00), then WebGL2 if unavailable.
- If the improved fit shader fails, try the proven version 20 shaders before abandoning GLB. The compatible shader can display less accurate skin/clothing intersections than the fitted shader.
- Simplified WebGL model is still available if both GLB shader modes fail; its status is no longer misleadingly marked as a successful GLB render.
- `Повторить 3D` tries to remount GLB without refreshing.
- Demo orders, accounts and database are unchanged. No real payments.

**Limit:** actual WebGL rendering must be confirmed on the user's Windows browser. If the badge says `GLB НЕ ЗАПУСТИЛСЯ`, press `?` and copy the diagnostic text.
