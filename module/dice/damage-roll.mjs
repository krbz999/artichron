export class DamageRoll extends Roll {
  constructor(formula, data = {}, options = {}) {
    const type = options.type;
    if (!type) throw new Error("A damage roll was constructed without a type.");
    super(formula, data, options);
    this.type = type;
  }

  /**
   * Evaluate an array of rolls and create a singular chat message.
   * @param {DamageRoll[]} rolls          The damage roll instances.
   * @param {object} [messageData]        Message data.
   * @returns {Promise<ChatMessage>}      A promise that resolves to the created chat message.
   */
  static async toMessage(rolls, messageData = {}) {
    for (const roll of rolls) if (!roll.evaluated) await roll.evaluate();

    const totals = rolls.reduce((acc, roll) => {
      const type = roll.type;
      if (!(type in CONFIG.SYSTEM.DAMAGE_TYPES)) return acc;
      acc[type] ??= 0;
      acc[type] += roll.total;
      return acc;
    }, {});
    const total = Object.values(totals).reduce((acc, total) => {
      return acc + (Number.isInteger(total) ? total : 0);
    }, 0);

    messageData = foundry.utils.mergeObject({
      "flags.artichron.totals": totals,
      rolls: rolls,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      content: await renderTemplate("systems/artichron/templates/chat/damage-roll.hbs", {
        rolls: rolls.map(r => ({roll: r, type: CONFIG.SYSTEM.DAMAGE_TYPES[r.options.type]})),
        total: total
      }),
      sound: "sounds/dice.wav",
      rollMode: game.settings.get("core", "rollMode")
    }, messageData, {inplace: false});
    return ChatMessage.implementation.create(messageData);
  }

  /**
   * Create a chat message with all the damage rolls.
   * @param {object} [messageData]
   */
  async toMessage(messageData = {}) {
    return this.constructor.toMessage([this], messageData);
  }
}
