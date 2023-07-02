import {SYSTEM} from "../../../helpers/config.mjs";

/**
 * Model of a singular damage field.
 *
 * @property {number} value     The size of the die that this rolls.
 * @property {string} type      The type of damage that this rolls.
 * @property {number} group     Which group this damage field belongs to.
 */
class Damage extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new foundry.data.fields.StringField({label: "ARTICHRON.DamageFormula"}),
      type: new foundry.data.fields.StringField({choices: SYSTEM.DAMAGE_TYPES, label: "ARTICHRON.DamageType"})
    };
  }
}

export class DamageField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new Damage(value, {parent: model});
  }
}
