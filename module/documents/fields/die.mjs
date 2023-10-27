export class DefenseDie extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      faces: new foundry.data.fields.NumberField({initial: 4})
    };
  }

  /**
   * Get a dice representation.
   * @type {string}
   */
  get die() {
    return `d${this.faces}`;
  }

  /**
   * Get a full formula representation.
   * @type {string}
   */
  get formula() {
    return `1${this.die}`;
  }

  /** @override */
  toString() {
    return this.formula;
  }
}

export class PoolDie extends DefenseDie {
  /** @override */
  static defineSchema() {
    return {
      value: new foundry.data.fields.NumberField({integer: true, min: 0, required: true, initial: null}),
      max: new foundry.data.fields.NumberField({integer: true, min: 0, required: true, initial: null}),
      faces: new foundry.data.fields.NumberField({initial: 4})
    };
  }

  /**
   * Does this pool have more dice available than normally allowed?
   * @type {boolean}
   */
  get overflow() {
    return this.value > this.max;
  }

  /**
   * Does this pool have any dice available?
   * @type {boolean}
   */
  get available() {
    return (this.value > 0) && (this.max > 0);
  }
}
