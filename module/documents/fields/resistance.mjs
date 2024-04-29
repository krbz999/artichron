import {ResistanceBonusField} from "./resistance-bonus-field.mjs";

export default class Resistance extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      bonus: new ResistanceBonusField({required: true})
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
