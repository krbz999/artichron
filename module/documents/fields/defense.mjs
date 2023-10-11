export default class Defense extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      bonus: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
    };
  }

  /** @override */
  toString() {
    return this.total;
  }
}
