import {SYSTEM} from "../helpers/config.mjs";

export class DamageRoll extends Roll {
  constructor(formula, data = {}, options = {}) {
    const type = options.type;
    if (!type) throw new Error("A damage roll was constructed without a type.");
    formula = artichron.utils.simplifyRollFormula(formula);
    super(formula, data, options);
    this.type = type;
  }

  /**
   * The damage type of this roll.
   * @type {string}
   */
  type = null;

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

    messageData = foundry.utils.mergeObject({
      "flags.artichron.totals": totals,
      rolls: rolls,
      sound: "sounds/dice.wav",
      rollMode: game.settings.get("core", "rollMode"),
      type: "damage"
    }, messageData, {inplace: false});
    messageData.content = await this._renderTemplateMethod(messageData);

    return ChatMessage.implementation.create(messageData);
  }

  /**
   * Create a chat message with all the damage rolls.
   * @param {object} [messageData]
   */
  async toMessage(messageData = {}) {
    return this.constructor.toMessage([this], messageData);
  }

  static async _renderTemplateMethod(messageData) {
    const {targets, templateData} = messageData.flags.artichron ?? {};
    const rolls = messageData.rolls;
    const tokens = targets?.map(uuid => fromUuidSync(uuid));

    const promises = rolls.map(async (roll) => {
      return {
        formula: roll.formula,
        tooltip: await roll.getTooltip(),
        config: SYSTEM.DAMAGE_TYPES[roll.options.type],
        total: roll.total
      };
    });

    return renderTemplate("systems/artichron/templates/chat/damage-roll.hbs", {
      targets: tokens,
      templateData: templateData,
      rolls: await Promise.all(promises)
    });
  }
}
