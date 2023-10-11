import {IdentifierField} from "../fields/identifier.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class ArmorData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      identifier: new IdentifierField(),
      resistance: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField(),
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      mobility: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField(),
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      attack: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField(),
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      }),
      armor: new foundry.data.fields.SchemaField({
        value: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
      })
    };
  }
}
