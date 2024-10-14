import FormulaModel from "./formula-model.mjs";

const {StringField} = foundry.data.fields;

export default class DamageFormulaModel extends FormulaModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      _id: new StringField({
        required: true,
        blank: false,
        readonly: true,
        initial: () => foundry.utils.randomID()
      }),
      type: new StringField({
        required: true,
        choices: CONFIG.SYSTEM.DAMAGE_TYPES,
        initial: "physical"
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ACTIVITY.FIELDS.damage"
  ];

  /* -------------------------------------------------- */

  /**
   * Formula representation.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }

  /* -------------------------------------------------- */

  /**
   * The id of this damage part.
   * @type {string}
   */
  get id() {
    return this._id;
  }
}
