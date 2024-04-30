import {FormulaField} from "./formula-field.mjs";

export default class Resistance extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      bonus: new FormulaField({required: true})
    };
  }

  /**
   * Are you resistant to this type?
   * @type {boolean}
   */
  get resistant() {
    return this.total > 0;
  }

  /** @override */
  toString() {
    return this.total;
  }
}
