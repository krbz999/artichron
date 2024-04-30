export class FormulaField extends foundry.data.fields.StringField {
  /** @override */
  _applyChangeAdd(value, delta, model, change) {
    delta = delta.trim();
    const d0 = delta[0];
    if (!["-", "+"].includes(d0) && value) delta = `+${delta}`;
    return super._applyChangeAdd(value, delta, model, change);
  }
}
