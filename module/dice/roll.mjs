export default class RollArtichron extends Roll {
  constructor(formula, data = {}, options = {}) {
    super(formula, data, options);
    this.configure();
  }

  /* -------------------------------------------------- */

  /**
   * Simplify numbers and faces.
   */
  configure() {
    for (const die of this.dice) {
      const n = die._number;
      if ((n instanceof RollArtichron) && n.isDeterministic) die._number = n.evaluateSync().total;
      const f = die._faces;
      if ((f instanceof RollArtichron) && f.isDeterministic) die._faces = f.evaluateSync().total;
    }

    for (const [i, term] of this.terms.entries()) {
      if ((term.roll instanceof RollArtichron) && term.isDeterministic) {
        this.terms[i] = new foundry.dice.terms.NumericTerm({ number: term.roll.evaluateSync().total });
      }
    }

    this.resetFormula();
  }

  /* -------------------------------------------------- */

  /**
   * Evaluate an array of rolls and create a singular chat message.
   * @param {RollArtichron[]} rolls             The roll instances.
   * @param {object} [messageData]              The data object to use when creating the message.
   * @param {object} [options]                  Additional options which modify the created message.
   * @param {string} [options.rollMode]         The template roll mode to use for the message from CONFIG.Dice.rollModes.
   * @param {boolean} [options.create]          Whether to automatically create the chat message or return message data.
   * @returns {Promise<ChatMessage|object>}     A promise that resolves to the created chat message.
   */
  static async toMessage(rolls, messageData = {}, { rollMode, create = true } = {}) {
    for (const roll of rolls) if (!roll._evaluated) await roll.evaluate();

    messageData = foundry.utils.mergeObject({
      rolls: rolls,
      sound: CONFIG.sounds.dice,
      rollMode: rollMode ? rollMode : game.settings.get("core", "rollMode"),
    }, messageData, { inplace: false });

    if (create) return ChatMessage.implementation.create(messageData);
    return messageData;
  }

  /* -------------------------------------------------- */

  /**
   * Create a chat message with all the rolls.
   * @param {object} [messageData]      The data object to use when creating the message.
   * @param {object} [options]          Additional options which modify the created message.
   */
  async toMessage(messageData = {}, { rollMode, create = true } = {}) {
    return this.constructor.toMessage([this], messageData, { rollMode, create });
  }
}
