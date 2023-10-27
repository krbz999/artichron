import {IdentifierField} from "../fields/identifier.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class ArmorData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      identifier: new IdentifierField(),
      resistances: new fields.ArrayField(new fields.SchemaField({
        type: new fields.StringField(),
        value: new fields.NumberField({integer: true, required: true, initial: null})
      })),
      mobility: new fields.SchemaField({
        type: new fields.StringField(),
        value: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      attack: new fields.SchemaField({
        type: new fields.StringField(),
        value: new fields.NumberField({integer: true, required: true, initial: null})
      }),
      armor: new fields.SchemaField({
        value: new fields.NumberField({integer: true, required: true, initial: null})
      })
    };
  }
}
