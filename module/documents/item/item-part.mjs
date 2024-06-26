import {ItemSystemModel} from "./system-model.mjs";

const {SchemaField, StringField, NumberField} = foundry.data.fields;

export default class PartData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "loot",
    type: "part"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({
          initial: 1,
          min: 0,
          integer: true,
          nullable: true,
          label: "ARTICHRON.ItemProperty.Quantity.Value",
          hint: "ARTICHRON.ItemProperty.Quantity.ValueHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypePart",
          hint: "ARTICHRON.ItemProperty.Category.SubtypePartHint",
          choices: CONFIG.SYSTEM.PART_TYPES
        })
      })
    };
  }
}
