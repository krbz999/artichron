export default class Damage extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      value: new fields.StringField({label: "ARTICHRON.DamageFormula"}),
      type: new fields.StringField({label: "ARTICHRON.DamageType"}),
      optional: new fields.BooleanField(),
      group: new fields.NumberField({integer: true, min: 0})
    };
  }

  /** @override */
  toString() {
    return this.value;
  }
}
