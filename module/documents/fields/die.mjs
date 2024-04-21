const {NumberField, SchemaField, BooleanField, StringField} = foundry.data.fields;

export class DiceModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      faces: new NumberField({integer: true, positive: true, initial: 4}),
      modifiers: new SchemaField({
        r: new StringField({required: true}),
        x: new StringField({required: true}),
        min: new StringField({required: true}),
        max: new StringField({required: true}),
        xo: new BooleanField(),
        rr: new BooleanField()
      })
    };
  }

  /**
   * Prepare derived values.
   * @param {object} rollData     Roll data object provided by the parent actor.
   */
  prepareDerivedData(rollData) {
    ["r", "x", "min", "max"].forEach(k => {
      const value = artichron.utils.simplifyBonus(this.modifiers[k], rollData);
      this.modifiers[k] = Math.max(0, value);
    });

    const {r, x, min, max, xo, rr} = this.modifiers;
    let mods = "";

    if ((r > 0) && (r < this.faces)) {
      const o = (r === 1) ? "=" : "<=";
      mods += rr ? `rr${o}${r}` : `r${o}${r}`;
    }

    if ((x > 0) && (x < this.faces)) {
      const o = (x === 1) ? "=" : ">=";
      mods += xo ? `xo${o}${this.faces - x + 1}` : `x${o}${this.faces - x + 1}`;
    }

    if ((min > 0) && (min < this.faces)) {
      mods += `min${min}`;
    }

    if ((max > 0) && (max < this.faces)) {
      mods += `max${this.faces - max}`;
    }
    this.mods = mods;
  }

  /**
   * The die denomination, with no modifiers.
   * @type {string}
   */
  get denom() {
    return `d${this.faces}`;
  }

  /**
   * The die, with modifiers.
   * @type {string}
   */
  get die() {
    return `${this.denom}${this.mods}`;
  }
}

/**
 * Specialized dice model for health, mana, and stamina dice.
 */
export class PoolDiceModel extends DiceModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      value: new NumberField({integer: true, min: 0, initial: 3}),
      max: new NumberField({integer: true, positive: true, initial: 3})
    };
  }

  /** @override */
  prepareDerivedData(rollData, isPrimary = false) {
    super.prepareDerivedData(rollData);
    this.faces = isPrimary ? 6 : 4;
  }

  /**
   * Is this pool overflowing?
   * @type {boolean}
   */
  get overflow() {
    return this.value > this.max;
  }

  /**
   * Does this pool have uses remaining?
   * @type {boolean}
   */
  get available() {
    return (this.value > 0) && (this.max > 0);
  }

  /**
   * The full formula.
   * @type {string}
   */
  get formula() {
    return `1${this.die}`;
  }
}

/**
 * Specialized dice model for parry and block dice.
 */
export class DefenseDiceModel extends DiceModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      number: new StringField({required: true})
    };
  }

  /** @override */
  prepareDerivedData(rollData) {
    super.prepareDerivedData(rollData);
    this.number = Math.max(1, artichron.utils.simplifyBonus(this.number, rollData));
  }

  /**
   * The full formula.
   * @type {string}
   */
  get formula() {
    return `${this.number}${this.die}`;
  }
}

/**
 * Specialized dice model for head, arms, legs dice.
 */
export class SkillDiceModel extends DiceModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      faces: new NumberField({initial: 4, choices: {4: "d4", 8: "d8", 12: "d12"}})
    };
  }

  /** @override */
  prepareDerivedData(rollData) {
    super.prepareDerivedData(rollData);
  }

  /**
   * The full formula.
   * @type {string}
   */
  get formula() {
    return `1${this.die}`;
  }
}
