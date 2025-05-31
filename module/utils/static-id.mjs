/**
 * Create a unique id for a status condition.
 * @param {string} status     The primary status.
 * @returns {string}          A unique 16-character id.
 */
export default function staticId(status) {
  if (status.length >= 16) return status.substring(0, 16);
  return status.padEnd(16, "0");
}
