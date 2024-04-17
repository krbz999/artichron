import {ArmorField} from "../fields/armor-field.mjs";
import {IdentifierField} from "../fields/identifier.mjs";
import {ItemSystemModel} from "./system-model.mjs";

const {ArrayField, SchemaField, StringField, NumberField} = foundry.data.fields;

export default class ArmorData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      identifier: new IdentifierField(),
      resistances: new ArrayField(new SchemaField({
        type: new StringField({required: true}),
        value: new NumberField({integer: true})
      })),
      armor: new ArmorField()
    };
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "armor.value"
    ]));
  }
}
