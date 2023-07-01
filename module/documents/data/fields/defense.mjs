import {SYSTEM} from "../../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

/** A single schema field for a single type of resistance. */
class Defense extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      bonus: new ValueField()
    };
  }

  toString() {
    return this.total;
  }
}

/** A full schema field for all types of resistances. */
export class DefenseField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new Defense(value, {parent: model});
  }

}

export function buildDefenseFields() {
  const fields = {};
  for (const type in SYSTEM.DEFENSE_TYPES) {
    fields[type] = new DefenseField();
  }
  return fields;
}
