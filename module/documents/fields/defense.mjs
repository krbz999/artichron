export default class Defense extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      bonus: new foundry.data.fields.StringField({required: true})
    };
  }

  /** @override */
  toString() {
    return this.total;
  }
}
