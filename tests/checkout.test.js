'use strict';
const VRCheckout = require('../checkout.js');

module.exports = [
  {
    name: 'a fully filled, valid contact form passes with no errors',
    fn(assert) {
      const { valid, errors } = VRCheckout.validateContact({ name: 'Анна', email: 'anna@example.com', address: 'Москва, ул. Пушкина, 10' });
      assert.strictEqual(valid, true);
      assert.deepStrictEqual(errors, {});
    },
  },
  {
    name: 'an empty form reports an error for every required field',
    fn(assert) {
      const { valid, errors } = VRCheckout.validateContact({ name: '', email: '', address: '' });
      assert.strictEqual(valid, false);
      assert.ok(errors.name);
      assert.ok(errors.email);
      assert.ok(errors.address);
    },
  },
  {
    name: 'a one-letter name is rejected, a two-letter name is accepted',
    fn(assert) {
      assert.ok(VRCheckout.validateContact({ name: 'A', email: 'a@b.co', address: '12345678' }).errors.name);
      assert.strictEqual(VRCheckout.validateContact({ name: 'Ан', email: 'a@b.co', address: '12345678' }).errors.name, undefined);
    },
  },
  {
    name: 'malformed emails are rejected, a plausible email is accepted',
    fn(assert) {
      for (const bad of ['not-an-email', 'missing@domain', '@nohandle.com', 'spaces in@email.com']) {
        assert.ok(VRCheckout.validateContact({ name: 'Ok', email: bad, address: '12345678' }).errors.email, bad);
      }
      assert.strictEqual(VRCheckout.validateContact({ name: 'Ok', email: 'ok@example.com', address: '12345678' }).errors.email, undefined);
    },
  },
  {
    name: 'a too-short address is rejected',
    fn(assert) {
      assert.ok(VRCheckout.validateContact({ name: 'Ok', email: 'ok@example.com', address: 'short' }).errors.address);
    },
  },
  {
    name: 'whitespace-only input is treated as empty (trimmed before checking length)',
    fn(assert) {
      const { valid, errors } = VRCheckout.validateContact({ name: '   ', email: '  ', address: '        ' });
      assert.strictEqual(valid, false);
      assert.ok(errors.name);
      assert.ok(errors.address);
    },
  },
];
