// A helper class to combine several rolls into one, each with a damage type.
export class DamageRollCombined {
  constructor(parts, data = {}, options = {}) {
    this.rolls = parts.map(part => new DamageRoll(part.value, data, {...options, type: part.type}));
  }

  /**
   * Evaluate each roll.
   * @returns {Promise<DamageRoll[]>}     The evaluated rolls.
   */
  async evaluate() {
    for (const roll of this.rolls) if (!roll._evaluated) await roll.evaluate();
    return this.rolls;
  }

  /**
   * Create a chat message with all the damage rolls.
   * @param {object} [messageData={}]
   */
  async toMessage(messageData = {}) {
    if (!this.evaluated) await this.evaluate();
    const totals = this.totals;
    messageData = foundry.utils.mergeObject({
      "flags.artichron.totals": totals,
      rolls: this.rolls,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: await renderTemplate("systems/artichron/templates/chat/damage-roll.hbs", {
        rolls: this.rolls.map(r => ({roll: r, type: CONFIG.SYSTEM.DAMAGE_TYPES[r.options.type]})),
        total: this.total
      }),
      sound: "sounds/dice.wav",
      rollMode: game.settings.get("core", "rollMode")
    }, messageData, {inplace: false});
    return ChatMessage.implementation.create(messageData);
  }

  /**
   * Is this roll evaluated?
   * @type {boolean}
   */
  get evaluated() {
    return this.rolls.every(roll => roll._evaluated);
  }

  /**
   * Get the combined formula.
   * @type {string}
   */
  get formula() {
    return this.rolls.map(roll => roll.formula).join(" + ");
  }

  /**
   * Get the total, type-less damage.
   * @type {number}
   */
  get total() {
    return Object.values(this.totals).reduce((acc, total) => {
      return acc + (Number.isInteger(total) ? total : 0);
    }, 0);
  }

  /**
   * Get an object of typed damage.
   * @type {object<string, number}
   */
  get totals() {
    if (!this.evaluated) return null;
    return this.rolls.reduce((acc, roll) => {
      const type = roll.type;
      if (!(type in CONFIG.SYSTEM.DAMAGE_TYPES)) return acc;
      acc[type] ??= 0;
      acc[type] += roll.total;
      return acc;
    }, {});
  }
}

export class DamageRoll extends Roll {
  constructor(formula, data = {}, options = {}) {
    const type = options.type;
    if (!type) throw new Error("A damage roll was constructed without a type.");
    super(formula, data, options);
    this.type = type;
  }
}
