import {ItemSystemModel} from "./system-model.mjs";

export default class PartData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      quantity: new fields.SchemaField({
        value: new fields.NumberField({min: 0, integer: true, initial: 1})
      })
    };
  }
}
