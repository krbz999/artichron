import {RollArtichron} from "./roll.mjs";

export class DamageRoll extends RollArtichron {
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
  /*   Instance methods                                 */
  /* -------------------------------------------------- */
}
