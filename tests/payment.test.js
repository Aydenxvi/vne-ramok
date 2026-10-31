'use strict';
const VRPayment = require('../payment.js');

module.exports = [
  {
    name: 'idle -> submit -> processing',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('idle', 'submit'), 'processing');
    },
  },
  {
    name: 'processing -> resolve-success -> success',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('processing', 'resolve-success'), 'success');
    },
  },
  {
    name: 'processing -> resolve-error -> error, then error -> submit -> processing (retry)',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('processing', 'resolve-error'), 'error');
      assert.strictEqual(VRPayment.nextState('error', 'submit'), 'processing');
    },
  },
  {
    name: 'double submit: a second submit while processing is a no-op',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('processing', 'submit'), 'processing');
      assert.strictEqual(VRPayment.canSubmit('processing'), false);
    },
  },
  {
    name: 'submitting again after success is a no-op (no duplicate order)',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('success', 'submit'), 'success');
      assert.strictEqual(VRPayment.canSubmit('success'), false);
    },
  },
  {
    name: 'cancel (closing the dialog) always returns to idle, even mid-processing',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('processing', 'cancel'), 'idle');
      assert.strictEqual(VRPayment.nextState('success', 'cancel'), 'idle');
      assert.strictEqual(VRPayment.nextState('error', 'cancel'), 'idle');
    },
  },
  {
    name: 'a stray resolve-success/resolve-error while idle does not fake a result',
    fn(assert) {
      assert.strictEqual(VRPayment.nextState('idle', 'resolve-success'), 'idle');
      assert.strictEqual(VRPayment.nextState('idle', 'resolve-error'), 'idle');
    },
  },
];
