export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.HTMLField({label: "ARTICHRON.DescriptionValue"})
      }),
      weight: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      price: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      type: new foundry.data.fields.StringField()
    };
  }
}
