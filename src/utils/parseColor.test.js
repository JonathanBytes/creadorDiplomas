import test from 'node:test';
import assert from 'node:assert/strict';

import { parseColor } from './parseColor.js';

test('parses 6-digit hex with and without the leading hash', () => {
  assert.deepEqual(parseColor('#ff8000'), { type: 'RGB', red: 1, green: 128 / 255, blue: 0 });
  assert.deepEqual(parseColor('ff8000'), { type: 'RGB', red: 1, green: 128 / 255, blue: 0 });
});

test('parses 3-digit shorthand', () => {
  assert.deepEqual(parseColor('#f80'), { type: 'RGB', red: 1, green: 136 / 255, blue: 0 });
});

test('falls back to black for invalid input', () => {
  for (const value of ['', '   ', 'not-a-color', '#12345', '#1234567', null, undefined, 'rgb(1,2,3)']) {
    assert.deepEqual(parseColor(value), { type: 'RGB', red: 0, green: 0, blue: 0 });
  }
});

test('is case insensitive and tolerant of surrounding whitespace', () => {
  assert.deepEqual(parseColor('  #FF8000  '), parseColor('#ff8000'));
});
