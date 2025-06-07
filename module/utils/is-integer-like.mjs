/**
 * Is a given value integer-like (an integer instance of Number or string of such)?
 * @param {string|number} value   The value to test.
 * @param {object} [options={}]   Additional validation options.
 * @param {-1|1} [options.sign]   Must the integer also be negative (-1) or positive (1)?
 * @returns {boolean}
 */
export default function isIntegerLike(value, options = {}) {
  value = Number(value);
  if (!Number.isInteger(value)) return false;

  switch (options.sign) {
    case -1: return value < 0;
    case 1: return value > 0;
    default: return true;
  }
}
