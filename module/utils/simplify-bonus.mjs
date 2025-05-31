/**
 * Convert a bonus value to a number.
 * @param {number|string|null} formula      The string to parse.
 * @param {object} [data]                   The roll data used to replace terms.
 * @returns {number}
 */
export default function simplifyBonus(formula, data = {}) {
  if (!formula) return 0;
  if (Number.isNumeric(formula)) return Number(formula);
  try {
    const roll = foundry.dice.Roll.create(formula, data);
    return roll.evaluateSync({ strict: false }).total;
  } catch (error) {
    console.error(error);
    return 0;
  }
}
