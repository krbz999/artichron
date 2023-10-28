/**
 * Convert a bonus value to a number.
 * @param {number|string|null} formula      The string to parse.
 * @param {object} [data={}]                The roll data used to replace terms.
 * @returns {number}
 */
function simplifyFormula(formula, data = {}) {
  if (!formula) return 0;
  if (Number.isNumeric(formula)) return Number(formula);
  try {
    const roll = new Roll(formula, data);
    return roll.isDeterministic ? Roll.safeEval(roll.formula) : 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

export {
  simplifyFormula
};
