const ALLOWED_SEPARATORS = /[\s().-]/g;
const VALID_PHONE_INPUT = /^\+?[0-9\s().-]+$/;

/**
 * Normalize a phone number for Baileys pairing code requests.
 * WhatsApp expects country code + digits without a leading plus or separators.
 * Local numbers without a country code are intentionally rejected.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function normalizePhoneNumber(input) {
  if (typeof input !== 'string') {
    throw new TypeError('PAIRING_PHONE must be a string');
  }

  const value = input.trim();
  if (!value) {
    throw new Error('PAIRING_PHONE cannot be empty');
  }

  if (!VALID_PHONE_INPUT.test(value)) {
    throw new Error('PAIRING_PHONE contains unsupported characters');
  }

  let digits = value.replace(ALLOWED_SEPARATORS, '');
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  if (!/^\d{8,15}$/.test(digits)) {
    throw new Error('PAIRING_PHONE must contain 8 to 15 digits with country code');
  }

  if (digits.startsWith('0')) {
    throw new Error('PAIRING_PHONE must use an international country code');
  }

  return digits;
}

/**
 * Return a non-sensitive display form without exposing the full number.
 * @param {string} normalized
 * @returns {string}
 */
export function maskPhoneNumber(normalized) {
  if (typeof normalized !== 'string' || normalized.length < 4) {
    return '[invalid]';
  }

  return `${normalized.slice(0, 2)}${'*'.repeat(Math.max(2, normalized.length - 4))}${normalized.slice(-2)}`;
}
