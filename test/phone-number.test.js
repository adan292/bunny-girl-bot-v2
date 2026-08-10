import test from 'node:test';
import assert from 'node:assert/strict';
import { maskPhoneNumber, normalizePhoneNumber } from '../src/utils/phone-number.js';

test('normalizes E.164 numbers with common separators', () => {
  assert.equal(normalizePhoneNumber('+52 (771) 123-4567'), '527711234567');
  assert.equal(normalizePhoneNumber('0052 771 123 4567'), '527711234567');
});

test('rejects local, short and malformed numbers', () => {
  assert.throws(() => normalizePhoneNumber('0123456789'), /international country code/);
  assert.throws(() => normalizePhoneNumber('+52abc7711234567'), /unsupported characters/);
  assert.throws(() => normalizePhoneNumber('+1'), /8 to 15 digits/);
});

test('masks a normalized number', () => {
  assert.equal(maskPhoneNumber('527711234567'), '52********67');
});
