const {SchemaField, HTMLField, NumberField, StringField, ArrayField} = foundry.data.fields;

export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({label: "ARTICHRON.ItemProperty.DescriptionValue", required: true})
      }),
      weight: new SchemaField({
        value: new NumberField({integer: true, min: 0, initial: 1})
      }),
      price: new SchemaField({
        value: new NumberField({integer: true, min: 0, initial: null})
      }),
      category: new SchemaField({
        subtype: new StringField({required: true})
      }),
      fusion: new ArrayField(new SchemaField({ // UNUSED
        key: new StringField({required: true}),
        value: new StringField({required: true}),
        mode: new NumberField({/*choices: Object.values(ItemSystemModel.FUSION_MODES)*/})
      }))
    };
  }

  async use() {
    throw new Error("Subclasses of the Item System Data Model must override the #use method.");
  }

  /**
   * Properties that can be amplified by a fused item.
   * @type {Set<string>}
   */
  get BONUS_FIELDS() {
    return new Set([
      "name",
      "img",
      "system.price.value",
      "system.weight.value"
    ]);
  }

  /** @override */
  prepareDerivedData() {
    if (!this.parent.isEmbedded) this.preparePostData();
  }

  /**
   * Preparation method for any data that depends on prepared actor data. Called after all data
   * preparation if the item is owned, otherwise at the end of `prepareDerivedData`.
   */
  preparePostData() {}
}
