export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.SchemaField({
        value: new fields.HTMLField({label: "ARTICHRON.DescriptionValue"})
      }),
      weight: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      price: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      type: new fields.SchemaField({
        category: new fields.StringField(),
        subtype: new fields.StringField()
      })
    };
  }
}
