'use strict';
// Zero-dependency test runner: `node tests/run.js`. Each test file exports an array
// of {name, fn} cases via module.exports; fn throws (via assert) on failure.
const assert = require('assert');
const path = require('path');

const files = ['cart.test.js', 'payment.test.js', 'checkout.test.js', 'wardrobe.test.js', 'outfit3d.test.js', 'shaders.test.js', 'glbassets.test.js', 'portfolio23.test.js', 'receipt.test.js'];
let pass = 0, fail = 0;

for (const file of files) {
  const cases = require(path.join(__dirname, file));
  for (const { name, fn } of cases) {
    try {
      fn(assert);
      pass++;
      console.log(`  ok  ${file} :: ${name}`);
    } catch (err) {
      fail++;
      console.log(`FAIL  ${file} :: ${name}`);
      console.log(`      ${err.message}`);
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
