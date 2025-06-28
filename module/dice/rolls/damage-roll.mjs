import RollArtichron from "./roll.mjs";

export default class DamageRoll extends RollArtichron {
  constructor(formula, data = {}, options = {}) {
    // FIXME
    if (!options.damageType && !!options.type) options.damageType = options.type;

    if (!options.damageType || !(options.damageType in artichron.config.DAMAGE_TYPES)) {
      throw new Error("A damage roll was constructed without a type.");
    }
    super(formula, data, options);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The damage type of this roll.
   * @type {string}
   */
  get damageType() {
    return this.options.damageType;
  }
  get type() {
    return this.damageType; // FIXME: remove need for this
  }

  /* -------------------------------------------------- */

  /**
   * The damage application options.
   * @type {Record<string, boolean>}
   */
  get damageOptions() {
    const options = {};
    for (const option of this.options.damageOptions ?? []) {
      options[option] = true;
    }
    return options;
  }

  /* -------------------------------------------------- */

  /**
   * Can this roll be reduced by armor or resistances?
   * @type {boolean}
   */
  get irreducible() {
    return (this.options.damageOptions ?? []).includes("irreducible");
  }

  /* -------------------------------------------------- */

  /**
   * If evaluated, the damage multiplier.
   * @type {number|null}
   */
  get multiplier() {
    if (!this._evaluated) return null;
    const multiplier = this.options.modifiers?.[artichron.config.DAMAGE_TYPES[this.damageType].group] ?? 1;
    return multiplier;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _evaluate(options = {}) {
    await super._evaluate(options);

    const multiplier = this.multiplier;
    if (multiplier !== 1) this._total = Math.round(this._total * multiplier);
    return this;
  }
}
