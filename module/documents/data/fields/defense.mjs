import {ValueField} from "./value.mjs";

/** A single schema field for a single type of resistance. */
class DefenseField extends foundry.abstract.DataModel {
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
export class DefensesField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    const fields = {};
    for (const type of ["armor", "block", "parry"]) {
      fields[type] = new DefenseField(value[type], {parent: model});
    }
    return fields;
  }
}
