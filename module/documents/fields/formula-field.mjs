export class FormulaField extends foundry.data.fields.StringField {
  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    delta = delta.trim();
    if (!delta) return value;
    const d0 = delta[0];
    if (!["-", "+"].includes(d0) && value) delta = ` + ${delta}`;
    else delta = ` ${delta}`;
    return super._applyChangeAdd(value, delta, model, change);
  }

  /* -------------------------------------------------- */

  /** @override */
  _applyChangeMultiply(value, delta, model, change) {
    return `(${value}) * ${delta}`;
  }

  /* -------------------------------------------------- */

  /** @override */
  _applyChangeUpgrade(value, delta, model, change) {
    return `max(${value}, ${delta})`;
  }

  /* -------------------------------------------------- */

  /** @override */
  _applyChangeDowngrade(value, delta, model, change) {
    return `min(${value}, ${delta})`;
  }
}
