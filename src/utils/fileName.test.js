import test from 'node:test';
import assert from 'node:assert/strict';

import { createFileNameFactory, sanitizeFileName } from './fileName.js';

test('sanitizes characters that are invalid in ZIP entry names', () => {
  assert.equal(sanitizeFileName('Juan/Carlos'), 'Juan-Carlos');
  assert.equal(sanitizeFileName('¿Quién?: "Ana" <1>'), '¿Quién- -Ana- -1-');
  assert.equal(sanitizeFileName('a\\b:c*d|e'), 'a-b-c-d-e');
  assert.equal(sanitizeFileName('Ana???'), 'Ana-');
});

test('falls back to a stable name for empty or dot-only input', () => {
  assert.equal(sanitizeFileName(''), 'diploma');
  assert.equal(sanitizeFileName('   '), 'diploma');
  assert.equal(sanitizeFileName('...'), 'diploma');
  assert.equal(sanitizeFileName(null), 'diploma');
});

test('keeps accents and emojis intact', () => {
  assert.equal(sanitizeFileName('José Núñez'), 'José Núñez');
  assert.equal(sanitizeFileName('Ana 🎓'), 'Ana 🎓');
});

test('de-duplicates repeated names instead of overwriting ZIP entries', () => {
  const nextFileName = createFileNameFactory();

  assert.equal(nextFileName('Ana'), 'Ana.pdf');
  assert.equal(nextFileName('Ana'), 'Ana (2).pdf');
  assert.equal(nextFileName('Ana'), 'Ana (3).pdf');
  assert.equal(nextFileName('Luis'), 'Luis.pdf');
  assert.equal(nextFileName('Ana '), 'Ana (4).pdf');
});

test('de-duplicates names that collide after sanitizing', () => {
  const nextFileName = createFileNameFactory();

  assert.equal(nextFileName('a/b'), 'a-b.pdf');
  assert.equal(nextFileName('a:b'), 'a-b (2).pdf');
});
