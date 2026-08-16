import { normalizePhoneNumber } from './phone-number.js';

const COUNTRY_CODES = new Map([
  ['1', 'Estados Unidos/Canadá'],
  ['52', 'México'],
  ['53', 'Cuba'],
  ['54', 'Argentina'],
  ['55', 'Brasil'],
  ['56', 'Chile'],
  ['57', 'Colombia'],
  ['58', 'Venezuela'],
  ['51', 'Perú'],
  ['591', 'Bolivia'],
  ['593', 'Ecuador'],
  ['594', 'Guayana Francesa'],
  ['595', 'Paraguay'],
  ['597', 'Surinam'],
  ['598', 'Uruguay'],
  ['502', 'Guatemala'],
  ['503', 'El Salvador'],
  ['504', 'Honduras'],
  ['505', 'Nicaragua'],
  ['506', 'Costa Rica'],
  ['507', 'Panamá'],
  ['1809', 'República Dominicana'],
  ['1829', 'República Dominicana'],
  ['1849', 'República Dominicana'],
  ['20', 'Egipto'],
  ['27', 'Sudáfrica'],
  ['30', 'Grecia'],
  ['31', 'Países Bajos'],
  ['32', 'Bélgica'],
  ['33', 'Francia'],
  ['34', 'España'],
  ['39', 'Italia'],
  ['40', 'Rumanía'],
  ['41', 'Suiza'],
  ['43', 'Austria'],
  ['44', 'Reino Unido'],
  ['45', 'Dinamarca'],
  ['46', 'Suecia'],
  ['47', 'Noruega'],
  ['48', 'Polonia'],
  ['49', 'Alemania'],
  ['61', 'Australia'],
  ['64', 'Nueva Zelanda'],
  ['7', 'Rusia'],
  ['81', 'Japón'],
  ['82', 'Corea del Sur'],
  ['86', 'China'],
  ['90', 'Turquía'],
  ['91', 'India'],
  ['234', 'Nigeria'],
  ['351', 'Portugal'],
  ['380', 'Ucrania'],
  ['966', 'Arabia Saudita'],
  ['971', 'Emiratos Árabes'],
  ['972', 'Israel'],
]);

function detectCountryCode(digits) {
  for (const prefix of COUNTRY_CODES.keys()) {
    if (digits.startsWith(prefix)) {
      return { code: prefix, name: COUNTRY_CODES.get(prefix) };
    }
  }
  return null;
}

function hasRepeatedDigits(digits) {
  return /^(\d)\1+$/.test(digits);
}

function hasSequentialRun(digits, length = 5) {
  const runs = ['0123456789', '9876543210'];
  return runs.some((run) => run.length >= length && run.includes(digits));
}

export function validatePairingPhone(input) {
  const result = {
    ok: false,
    normalized: null,
    countryCode: null,
    countryName: null,
    warnings: [],
    reason: null,
  };

  let digits;
  try {
    digits = normalizePhoneNumber(input);
  } catch (error) {
    result.reason = error.message;
    return result;
  }

  const country = detectCountryCode(digits);
  if (!country) {
    result.warnings.push('código de país no reconocido; WhatsApp puede rechazar el número');
  } else {
    result.countryCode = country.code;
    result.countryName = country.name;
  }

  const localDigits = country ? digits.slice(country.code.length) : digits;

  if (hasRepeatedDigits(localDigits)) {
    result.reason = 'todos los dígitos del número local son iguales (parece un número falso)';
    return result;
  }

  if (hasSequentialRun(localDigits)) {
    result.reason = 'el número local es secuencial (parece un número falso)';
    return result;
  }

  if (localDigits.length < 7) {
    result.warnings.push('el número local es muy corto; verifica que incluya el código de país');
  }
  if (localDigits.length > 12) {
    result.warnings.push('el número local es inusualmente largo; verifica que no repitas el código de país');
  }

  result.ok = true;
  result.normalized = digits;
  return result;
}