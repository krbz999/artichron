import ArsenalData from "./_item-arsenal.mjs";
import {SYSTEM} from "../../helpers/config.mjs";
import {ValueField} from "../fields/value.mjs";

export default class SpellData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.StringField({
        options: SYSTEM.SPELL_TYPES,
        label: "ARTICHRON.SpellType"
      }),
      cost: new foundry.data.fields.SchemaField({
        value: new ValueField(),
        type: new foundry.data.field.StringField({choices: ["health", "stamina", "mana"]})
      })
    };
  }
}
