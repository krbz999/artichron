import {SYSTEM} from "../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

class DefenseDie extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      faces: new foundry.data.fields.NumberField({
        choices: SYSTEM.DIE_SIZES,
        initial: 4,
        label: "ARTICHRON.DefenseDieSize"
      })
    };
  }

  get die() {
    return `d${this.faces}`;
  }

  get formula() {
    return `1${this.die}`;
  }

  toString() {
    return this.formula;
  }
}

class PoolDie extends DefenseDie {
  static defineSchema() {
    return {
      value: new ValueField({label: "ARTICHRON.PoolDieValue"}),
      max: new foundry.data.fields.StringField({required: true, label: "ARTICHRON.PoolDieMax"}),
      faces: new foundry.data.fields.NumberField({
        choices: SYSTEM.DIE_SIZES,
        initial: 4,
        label: "ARTICHRON.PoolDieSize"
      })
    };
  }

  get available() {
    return this.value > 0;
  }
}

export class PoolDieField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new PoolDie(value, {parent: model});
  }
}

export class DefenseDieField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new DefenseDie(value, {parent: model});
  }
}
