import {SYSTEM} from "../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

class Defense extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      bonus: new ValueField({label: "ARTICHRON.DefenseBonus"})
    };
  }

  toString() {
    return this.total;
  }
}

/** A full schema field for all types of defenses. */
class DefenseField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new Defense(value, {parent: model});
  }

}

/** Method to return the fields for defenses; armor, parry, block. */
export function buildDefenseFields() {
  const fields = {};
  for (const type in SYSTEM.DEFENSE_TYPES) {
    fields[type] = new DefenseField();
  }
  return fields;
}
