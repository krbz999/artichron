export default class Resistance extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      bonus: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
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
