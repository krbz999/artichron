/**
 * Sort an object by its keys.
 * @param {object} object
 * @returns {object}
 */
export default function(object, { inplace = true } = {}) {
  const isNumeric = Object.keys(object).every(key => Number.isNumeric(key));

  const entries = Object.entries(object).sort((a, b) => {
    if (isNumeric) {
      a = Number(a[0]);
      b = Number(b[0]);
      return a - b;
    }
    return a[0].localeCompare(b[0]);
  });

  if (inplace) {
    for (const k in object) delete object[k];
    for (const [k, v] of entries) object[k] = v;
    return object;
  }

  return Object.fromEntries(entries);
}
