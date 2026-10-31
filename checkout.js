'use strict';
// Pure validation for the demo checkout contact/address form — no DOM, so it's testable
// in Node. The form never submits anywhere: this only decides what the UI should show.
(function (root) {
  function validateContact(fields) {
    const name = String(fields.name || '').trim();
    const email = String(fields.email || '').trim();
    const address = String(fields.address || '').trim();
    const errors = {};
    if (name.length < 2) errors.name = 'Укажи имя (минимум 2 символа).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Укажи email в формате name@example.com.';
    if (address.length < 8) errors.address = 'Укажи адрес доставки подробнее (минимум 8 символов).';
    return { valid: Object.keys(errors).length === 0, errors };
  }

  const api = { validateContact };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.VRCheckout = api;
})(typeof window !== 'undefined' ? window : globalThis);
