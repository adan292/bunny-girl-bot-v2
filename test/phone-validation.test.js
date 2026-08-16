import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePairingPhone } from '../src/utils/phone-validation.js';

test('accepts a plausible international number', () => {
  const result = validatePairingPhone('+58 424 2773183');
  assert.equal(result.ok, true);
  assert.equal(result.normalized, '584242773183');
  assert.equal(result.countryCode, '58');
  assert.equal(result.countryName, 'Venezuela');
});

test('rejects a number without country code', () => {
  const result = validatePairingPhone('04242773183');
  assert.equal(result.ok, false);
  assert.match(result.reason, /international/i);
});

test('rejects a number with all repeated digits', () => {
  const result = validatePairingPhone('5811111111');
  assert.equal(result.ok, false);
  assert.match(result.reason, /falso/i);
});

test('rejects a sequential number', () => {
  const result = validatePairingPhone('5812345678');
  assert.equal(result.ok, false);
  assert.match(result.reason, /falso/i);
});

test('warns on an unknown country code but stays valid', () => {
  const result = validatePairingPhone('9994242773');
  assert.equal(result.ok, true);
  assert.equal(result.countryCode, null);
  assert.ok(result.warnings.some((warning) => /no reconocido/.test(warning)));
});

test('warns when the local number is suspiciously short', () => {
  const result = validatePairingPhone('58421');
  assert.equal(result.ok, false);
});

test('accepts the configured owner number', () => {
  const result = validatePairingPhone('584242773183');
  assert.equal(result.ok, true);
  assert.equal(result.countryName, 'Venezuela');
});
