import {SYSTEM} from "../../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

/**
 * Model of a singular damage field.
 *
 * @property {number} value     The size of the die that this rolls.
 * @property {string} type      The type of damage that this rolls.
 * @property {number} group     Which group this damage field belongs to.
 */
class DamageField extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new ValueField({choices: SYSTEM.DAMAGE_DICE}),
      type: new foundry.data.fields.StringField({choices: SYSTEM.DAMAGE_TYPES}),
      group: new ValueField()
    };
  }
}

export class DamagesField extends foundry.data.fields.ArrayField {
  initialize(value, model) {
    return value.map(v => new DamageField(v, {parent: model}));
  }
}
