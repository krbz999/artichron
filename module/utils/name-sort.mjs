/**
 * Sort two entries based on their `sort` value and then by `name`.
 * @param {*} one           One object-like structure.
 * @param {*} other         Other object-like structure.
 * @param {string} [key]    A single-level key for where to find the `sort` and `name`
 *                          properties if it is not at the root.
 * @returns {number}
 */
export default function nameSort(one, other, key) {
  const sort = property(one, "sort", key) - property(other, "sort", key);
  return sort ? sort : property(one, "name", key).localeCompare(property(other, "name", key));
}

const property = (obj, k, key) => {
  if (key) return obj[key][k];
  return obj[k];
};
