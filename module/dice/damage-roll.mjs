export class DamageRoll extends Roll {
  constructor(formula, data = {}, options = {}) {
    if (!options.type || !(options.type in CONFIG.SYSTEM.DAMAGE_TYPES)) {
      throw new Error("A damage roll was constructed without a type.");
    }
    super(formula, data, options);
  }

  /**
   * The damage type of this roll.
   * @type {string}
   */
  get type() {
    return this.options.type;
  }

  /**
   * Evaluate an array of rolls and create a singular chat message.
   * @param {DamageRoll[]} rolls                The damage roll instances.
   * @param {object} [messageData]              The data object to use when creating the message.
   * @param {object} [options]                  Additional options which modify the created message.
   * @param {string} [options.rollMode]         The template roll mode to use for the message from CONFIG.Dice.rollModes.
   * @param {boolean} [options.create]          Whether to automatically create the chat message or return message data.
   * @returns {Promise<ChatMessage|object>}     A promise that resolves to the created chat message.
   */
  static async toMessage(rolls, messageData = {}, {rollMode, create = true} = {}) {
    for (const roll of rolls) if (!roll.evaluated) await roll.evaluate();

    messageData = foundry.utils.mergeObject({
      rolls: rolls,
      sound: CONFIG.sounds.dice,
      rollMode: rollMode ? rollMode : game.settings.get("core", "rollMode")
    }, messageData, {inplace: false});

    if (create) return ChatMessage.implementation.create(messageData);
    return messageData;
  }

  /**
   * Create a chat message with all the damage rolls.
   * @param {object} [messageData]      The data object to use when creating the message.
   * @param {object} [options]          Additional options which modify the created message.
   */
  async toMessage(messageData = {}, {rollMode, create = true} = {}) {
    return this.constructor.toMessage([this], messageData, {rollMode, create});
  }
}
