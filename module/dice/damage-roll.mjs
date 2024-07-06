import {RollArtichron} from "./roll.mjs";

export class DamageRoll extends RollArtichron {
  constructor(formula, data = {}, options = {}) {
    if (!options.type || !(options.type in CONFIG.SYSTEM.DAMAGE_TYPES)) {
      throw new Error("A damage roll was constructed without a type.");
    }
    super(formula, data, options);
    this.#item = options.item ?? null;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * An item that created this damage roll.
   * @type {ItemArtichron}
   */
  #item = null;

  /* -------------------------------------------------- */

  /**
   * An item that created this damage roll.
   * @type {ItemArtichron}
   */
  get item() {
    return this.#item;
  }

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
   * Percentage bonuses derived from this damage roll's total.
   * @type {Map<string, number>}
   */
  #bonuses = null;

  /* -------------------------------------------------- */

  /**
   * Percentage bonuses derived from this damage roll's total.
   * @type {Map<string, number>}
   */
  get bonuses() {
    return new Map(this.#bonuses);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  static async toMessage(rolls, ...rest) {
    const bonuses = new Map();
    for (const roll of rolls) {
      if (!roll._evaluated) await roll.evaluate();
      for (const [type, damage] of roll.bonuses.entries()) {
        const value = bonuses.get(type) ?? 0;
        bonuses.set(type, value + damage);
      }
    }

    for (const [type, total] of bonuses.entries()) {
      const value = Math.max(1, Math.round(total));

      // If there is an existing roll of this type, add a number term to it.
      const existing = rolls.find(roll => roll.type === type);
      if (existing) {
        const number = new foundry.dice.terms.NumericTerm({number: value});
        const operator = new foundry.dice.terms.OperatorTerm({operator: "+"});
        number._evaluated = true;
        operator._evaluated = true;
        existing.terms.push(operator, number);
        existing.resetFormula();
        existing._total = existing._evaluateTotal();
      } else {
        const roll = new this(String(value), {}, {type: type});
        roll.evaluateSync(); // must evaluate here to avoid a loop.
        rolls.push(roll);
      }
    }

    return super.toMessage(rolls, ...rest);
  }

  /* -------------------------------------------------- */

  /** @override */
  async evaluate(...rest) {
    await super.evaluate(...rest);
    this.#evaluatePercentageBonuses();
    return this;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve any percentage bonuses from the item of this damage roll and construct the mapping.
   */
  #evaluatePercentageBonuses() {
    const total = this.total;
    const bonuses = new Map();
    // bonuses.set("ice", total * 0.37); // TODO
    this.#bonuses = bonuses;
  }
}
