const {StringField} = foundry.data.fields;

/** Specialized model for damage parts. */
export class DamageModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      formula: new StringField({required: true}),
      type: new StringField({required: true, label: "ARTICHRON.DamageType"})
    };
  }

  /** @override */
  prepareDerivedData(rollData) {}
}
