import FormulaModel from "./formula-model.mjs";

const {StringField} = foundry.data.fields;

export default class DamageFormulaModel extends FormulaModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new StringField({
        required: true,
        choices: CONFIG.SYSTEM.DAMAGE_TYPES,
        initial: "physical"
      })
    };
  }

  /* -------------------------------------------------- */

  /**
   * Formula representation.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }
}
