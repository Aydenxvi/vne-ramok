'use strict';
// Regression check for GLSL function calls: browser drivers reject invalid arity
// even when the fake WebGL object used by geometry tests reports compilation OK.
const fs = require('node:fs');
const path = require('node:path');
const file = fs.readFileSync(path.join(__dirname, '..', 'outfit-3d.js'), 'utf8');

function getShader(name) {
  const match = file.match(new RegExp('const\\s+' + name + '\\s*=\\s*`([\\s\\S]*?)`\\s*;'));
  if (!match) throw new Error('Missing ' + name);
  return match[1];
}
function checkArity(src, name, expected) {
  const re = new RegExp('\\b' + name + '\\s*\\(', 'g');
  let match, count = 0;
  while ((match = re.exec(src))) {
    count++;
    let depth = 1, args = 1, end = re.lastIndex;
    for (; end < src.length && depth; end++) {
      const ch = src[end];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === ',' && depth === 1) args++;
    }
    if (depth !== 0) throw new Error(name + '() has an unclosed parenthesis');
    if (args !== expected) {
      const line = src.slice(0, match.index).split('\n').length;
      throw new Error('GLSL ' + name + '() expects ' + expected + ' arguments, got ' + args + ' (line ' + line + ')');
    }
  }
  return count;
}
module.exports = [
  { name: 'GLSL shaders use correct intrinsic function arity (regression: max overload)', fn(assert) {
    const fragment = getShader('fragmentSource');
    const vertex = getShader('vertexSource');
    assert.ok(checkArity(fragment, 'max', 2) >= 3);
    for (const shader of [fragment, vertex]) {
      checkArity(shader, 'min', 2);
      checkArity(shader, 'pow', 2);
      checkArity(shader, 'clamp', 3);
      checkArity(shader, 'mix', 3);
    }
  }}
];
