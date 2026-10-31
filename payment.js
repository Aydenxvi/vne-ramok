'use strict';
// Pure demo-payment state machine: idle -> processing -> success | error -> (retry) processing.
// Kept dependency-free so tests/ can exercise every transition without a DOM.
(function (root) {
  function canSubmit(state) {
    return state === 'idle' || state === 'error';
  }

  // action: 'submit' | 'resolve-success' | 'resolve-error' | 'cancel'
  function nextState(state, action) {
    if (action === 'submit') return canSubmit(state) ? 'processing' : state;
    if (action === 'resolve-success') return state === 'processing' ? 'success' : state;
    if (action === 'resolve-error') return state === 'processing' ? 'error' : state;
    if (action === 'cancel') return 'idle';
    return state;
  }

  const api = { canSubmit, nextState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VRPayment = api;
})(typeof window !== 'undefined' ? window : globalThis);
