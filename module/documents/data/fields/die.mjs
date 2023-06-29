import {ValueField} from "./value.mjs";

class PoolDie extends foundry.abstract.DataModel {

  static defineSchema() {
    return {
      value: new ValueField(),
      max: new foundry.data.fields.StringField({required: true}),
      faces: new foundry.data.fields.NumberField({choices: [2, 3, 4, 6, 8, 10, 12], initial: 4})
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

  get available() {
    return this.value > 0;
  }
}

export class PoolDieField extends foundry.data.fields.ObjectField {
  initialize(value, model) {
    return new PoolDie(value, {parent: model});
  }
}
