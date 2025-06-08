export default class DamageRollFlow {
  constructor(config, dialog, message) {
    this.#config = foundry.utils.deepClone(config);
    this.#dialog = foundry.utils.deepClone(dialog);
    this.#message = foundry.utils.deepClone(message);
  }

  /* -------------------------------------------------- */

  /**
   * The roll configuration object.
   * @type {object}
   */
  #config;
  get config() {
    return this.#config;
  }

  /* -------------------------------------------------- */

  /**
   * The dialog configuration object.
   * @type {object}
   */
  #dialog;
  get dialog() {
    return this.#dialog;
  }

  /* -------------------------------------------------- */

  /**
   * The chat message configuration object.
   * @type {object}
   */
  #message;

  /* -------------------------------------------------- */

  /**
   * Has the damage roll been configured?
   * @type {boolean}
   */
  #configured = false;

  /* -------------------------------------------------- */

  /**
   * The created damage rolls.
   * @type {artichron.dice.rolls.DamageRoll[]}
   */
  #rolls;
  get rolls() {
    return this.#rolls;
  }

  /* -------------------------------------------------- */

  /**
   * Create and store damage rolls from the current configuration of the roll config.
   */
  #instantiateRolls() {
    if (this.#rolls) return;
    const rolls = [];
    for (const rollConfig of this.#config.rollConfigs) {
      const roll = new artichron.dice.rolls.DamageRoll(
        rollConfig.parts.join(" + "),
        this.#config.rollData,
        { damageType: rollConfig.damageType },
      );
      rolls.push(roll);
    }
    this.#rolls = rolls;
  }

  /* -------------------------------------------------- */

  /**
   * Configure the damage roll.
   * @returns {Promise<boolean>}    A promise that resolves to whether the damage was configured.
   */
  async configure() {
    if (this.#configured) {
      throw new Error("A damage roll cannot be configured twice!");
    }

    this.#instantiateRolls();

    if (!this.#dialog.bypass) {
      const Cls = artichron.applications.apps.actor.DamageRollFlowDialog;
      const configuration = await Cls.create({ flow: this });
      if (!configuration) return false;
    }

    return this.#configured = true;
  }

  /* -------------------------------------------------- */

  /**
   * Finalize the damage roll flow by creating and evaluating rolls and submitting to the chatlog.
   * @returns {Promise<artichron.dice.rolls.DamageRoll[]>}   A promise that resolves to the evaluated rolls.
   */
  async finalize() {
    if (!this.#configured) {
      const configured = await this.configure();
      if (!configured) return null;
    }

    const rolls = this.#rolls;
    for (const roll of rolls) await roll.evaluate();

    if (!this.#message.bypass) {
      const Cls = foundry.utils.getDocumentClass("ChatMessage");
      const messageData = {
        rolls,
        type: "usage",
        speaker: Cls.getSpeaker({ actor: this.#config.subject }),
        "flags.artichron.type": "damage", // FIXME: custom chat message subtype instead
      };
      Cls.applyRollMode(messageData, game.settings.get("core", "rollMode"));
      await Cls.create(messageData);
    }

    return rolls;
  }
}
