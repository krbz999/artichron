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
        type: new fields.StringField({required: true}),
        value: new fields.NumberField({integer: true})
      })),
      mobility: new fields.SchemaField({
        type: new fields.StringField({required: true}),
        value: new fields.NumberField({integer: true})
      }),
      attack: new fields.SchemaField({
        type: new fields.StringField({required: true}),
        value: new fields.NumberField({integer: true})
      }),
      armor: new fields.SchemaField({
        value: new fields.NumberField({integer: true})
      })
    };
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "mobility.value",
      "attack.value",
      "armor.value"
    ]));
  }
}
