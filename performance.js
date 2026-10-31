'use strict';
/* VNE RAMOK / MOTION 15 — runtime performance guard.
   The page keeps its editorial transitions, while inactive chapters stop
   their decorative infinite animations. This uses native browser APIs only. */
(() => {
  const chapters = Array.from(document.querySelectorAll(
    '.hero, #drop, #lookbook, #outfit, .pass-section, .categories-section, #catalog, #manifesto, footer'
  ));
  const prefersLessMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'vneramok-motion-quality-v1';
  let economy = false;
  try { economy = localStorage.getItem(storageKey) === 'eco'; } catch { /* storage blocked */ }

  const toggle = document.getElementById('motion-quality-toggle');
  const syncSetting = () => {
    document.body.classList.toggle('motion-eco', economy);
    if (toggle) {
      toggle.textContent = economy ? 'ЭФФЕКТЫ: ЭКО ↗' : 'ЭФФЕКТЫ: ПЛАВНЫЕ ↗';
      toggle.setAttribute('aria-pressed', String(economy));
      toggle.title = economy ? 'Включить более активные фоновые анимации' : 'Снизить нагрузку от фоновых анимаций';
    }
  };
  if (toggle) toggle.addEventListener('click', () => {
    economy = !economy;
    try { localStorage.setItem(storageKey, economy ? 'eco' : 'normal'); } catch { /* storage blocked */ }
    syncSetting();
  });
  syncSetting();

  if ('IntersectionObserver' in window) {
    // Never pause entrance transitions; only CSS animations are suspended.
    // Mark distant chapters immediately, then let IO wake them up before
    // they reach the viewport (which avoids first-frame animation hiccups).
    const margin = 250;
    const mark = (node, visible) => node.classList.toggle('motion-offscreen', !visible);
    for (const node of chapters) {
      const rect = node.getBoundingClientRect();
      mark(node, rect.bottom >= -margin && rect.top <= innerHeight + margin);
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) mark(entry.target, entry.isIntersecting);
    }, { rootMargin: `${margin}px 0px ${margin}px 0px`, threshold: 0 });
    chapters.forEach(node => observer.observe(node));
  }

  // A background tab should not spend CPU/GPU cycles on decorative motion.
  function syncVisibility() {
    document.body.classList.toggle('motion-tab-hidden', document.hidden);
  }
  document.addEventListener('visibilitychange', syncVisibility, { passive: true });
  syncVisibility();

  // When the customer opens a modal, keep checkout/receipt animations alive,
  // but suspend the entire storefront behind the opaque dialog backdrop.
  if ('MutationObserver' in window) {
    const dialogs = Array.from(document.querySelectorAll('dialog'));
    const syncDialogs = () => document.body.classList.toggle('motion-modal-open', dialogs.some(d => d.open));
    const observer = new MutationObserver(syncDialogs);
    dialogs.forEach(d => observer.observe(d, { attributes: true, attributeFilter: ['open'] }));
    syncDialogs();
  }

  // Helpful to QA locally without introducing a render loop or telemetry.
  window.VRPerformance = Object.freeze({
    mode: () => economy ? 'eco' : 'normal',
    pausedChapters: () => chapters.filter(el => el.classList.contains('motion-offscreen')).length,
    activeAnimations: () => document.getAnimations().filter(a => a.playState === 'running').length,
    reduceMotion: () => prefersLessMotion.matches
  });
})();
