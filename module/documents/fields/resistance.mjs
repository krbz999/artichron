import {SYSTEM} from "../../helpers/config.mjs";

/** A single schema field for a single type of resistance. */
class Resistance extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      bonus: new foundry.data.fields.NumberField({integer: true, required: true, initial: null})
    };
  }

  /**
   * Get whether you are resistant in this type.
   * @type {boolean}
   */
  get resistant() {
    return this.total > 0;
  }

  toString() {
    return this.total;
  }
}

/** A full schema field for all types of resistances. */
class ResistanceField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new Resistance(value, {parent: model});
  }
}

export function buildResistanceFields() {
  const fields = {};
  for (const type in SYSTEM.DAMAGE_TYPES) {
    if (SYSTEM.DAMAGE_TYPES[type].resist) {
      fields[type] = new ResistanceField({label: `ARTICHRON.Resistance${type.capitalize()}`});
    }
  }
  return fields;
}
