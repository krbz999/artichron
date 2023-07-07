import {SYSTEM} from "../../helpers/config.mjs";
import {ValueField} from "./value.mjs";

export class DefenseDie extends foundry.abstract.DataModel {
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

export class PoolDie extends DefenseDie {
  static defineSchema() {
    return {
      value: new ValueField({label: "ARTICHRON.PoolDieValue"}),
      max: new ValueField({label: "ARTICHRON.PoolDieMax"}),
      faces: new foundry.data.fields.NumberField({
        choices: SYSTEM.DIE_SIZES,
        initial: 4,
        label: "ARTICHRON.PoolDieSize"
      })
    };
  }

  get overflow() {
    return this.value > this.max;
  }

  get available() {
    return (this.value > 0) && (this.max > 0);
  }
}
