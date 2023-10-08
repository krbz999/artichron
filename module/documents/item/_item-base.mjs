export class BaseItemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "ARTICHRON.DescriptionValue"})
      }),
      traits: new foundry.data.fields.SchemaField(this._defineTraits())
    };
  }

  /** Define the inner 'traits' property. */
  static _defineTraits() {
    return {
      weight: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.WeightValue"
        })
      }),
      price: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({
          integer: true, required: true, initial: null, label: "ARTICHRON.PriceValue"
        })
      })
    };
  }
}
