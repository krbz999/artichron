import {SYSTEM} from "../../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

/** A single schema field for a single type of resistance. */
class ResistanceField extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      value: new ValueField(),
      bonus: new ValueField()
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
export class ResistancesField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    const fields = {};
    for (const type in SYSTEM.DAMAGE_TYPES) {
      if (SYSTEM.DAMAGE_TYPES[type].resist) {
        fields[type] = new ResistanceField(value[type], {parent: model});
      }
    }
    return fields;
  }
}
