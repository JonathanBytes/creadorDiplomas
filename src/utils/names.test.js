import test from 'node:test';
import assert from 'node:assert/strict';

import { countDescriptions, parseStudents } from './names.js';

test('parses a bare name line without a description', () => {
  assert.deepEqual(parseStudents('Ana Pérez'), [
    { name: 'Ana Pérez', description: '' },
  ]);
});

test('splits name and description on the first semicolon', () => {
  assert.deepEqual(parseStudents('Ana Pérez; Ingeniera Industrial'), [
    { name: 'Ana Pérez', description: 'Ingeniera Industrial' },
  ]);
});

test('keeps extra semicolons inside the description', () => {
  assert.deepEqual(parseStudents('Luis; Contador; Auditor'), [
    { name: 'Luis', description: 'Contador; Auditor' },
  ]);
});

test('trims fields and ignores blank lines and CRLF', () => {
  assert.deepEqual(
    parseStudents('  Ana ;  Diseñadora  \r\n\r\nLuis\r\n'),
    [
      { name: 'Ana', description: 'Diseñadora' },
      { name: 'Luis', description: '' },
    ],
  );
});

test('supports a description without a name', () => {
  assert.deepEqual(parseStudents('; Solo descripción'), [
    { name: '', description: 'Solo descripción' },
  ]);
});

test('empty input yields no students', () => {
  assert.deepEqual(parseStudents(''), []);
  assert.deepEqual(parseStudents(null), []);
  assert.deepEqual(parseStudents('   \n  \n'), []);
});

test('counts students that have a description', () => {
  const students = parseStudents('Ana; Uno\nLuis\nEva; Dos');

  assert.equal(countDescriptions(students), 2);
});
