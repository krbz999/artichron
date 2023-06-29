// Base model for items that are worn (head, chest, legs).
import {IdentifierField} from "../fields/identifier.mjs";
import {ValueField} from "../fields/value.mjs";
import {WeightField} from "../fields/weight.mjs";
import {BaseItemModel} from "./item-base.mjs";

export default class ArmorData extends BaseItemModel {
  static defineSchema() {
    return {
      type: new foundry.data.fields.StringField({choices: CONFIG.SYSTEM.ARMOR_TYPES}),
      identifier: new IdentifierField(), // the set that this is a part of.
      ...WeightField(),
      defenses: new foundry.data.fields.SchemaField({
        armor: new ValueField()
      }),
      resistance: new foundry.data.fields.SchemaField({
        type: new foundry.data.fields.StringField(),
        value: new ValueField({max: 3})
      }),
      mobility: new foundry.data.fields.SchemaField({
        value: new ValueField()
      }),
      attack: new foundry.data.fields.SchemaField({
        value: new ValueField()
      })
    };
  }

  /* -------------------------------- */

  // model specific getters go here. The item itself should have the same getters, but just return `this.system.<getter> ?? false`.


  get exampleGetter() {
    return true;
  }
}
