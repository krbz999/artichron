import RollArtichron from "./roll.mjs";

export default class DamageRoll extends RollArtichron {
  constructor(formula, data = {}, options = {}) {
    if (!options.type || !(options.type in CONFIG.SYSTEM.DAMAGE_TYPES)) {
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
  get type() {
    return this.options.type;
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
   * Can this roll be defended against?
   * @type {boolean}
   */
  get undefendable() {
    return (this.options.damageOptions ?? []).includes("undefendable");
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */
}
