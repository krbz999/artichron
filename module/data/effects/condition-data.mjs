import ActiveEffectSystemModel from "./system-model.mjs";

const { StringField, NumberField } = foundry.data.fields;

/**
 * System data for 'Conditions'.
 * These are ailments or other effects with optional support for levels of severity. Can apply to an actor or item.
 * @property {string} primary     The primary status of this condition.
 * @property {number} level       The level of this condition.
 */
export default class EffectConditionData extends ActiveEffectSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: "condition",
    });
  }

  /* -------------------------------------------------- */

  /**
   * The status ids that have a 'start of round' event.
   * @type {Set<string>}
   */
  static ROUND_START = new Set([
    "bleeding",
    "burning",
  ]);

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      primary: new StringField({ required: true, blank: false }),
      level: new NumberField({ nullable: true, initial: null, integer: true }),
    };
  }

  /* -------------------------------------------------- */

  get hasLevels() {
    const max = artichron.config.STATUS_CONDITIONS[this.primary].levels;
    return !!max || (max > 1);
  }

  /* -------------------------------------------------- */

  get canIncrease() {
    return this.hasLevels && (this.level < artichron.config.STATUS_CONDITIONS[this.primary].levels);
  }

  /* -------------------------------------------------- */

  get canDecrease() {
    return this.hasLevels && (this.level > 0);
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
    this.parent.statuses.add(this.primary);
    this.maxLevel = artichron.config.STATUS_CONDITIONS[this.primary].levels || null;
    if (!this.maxLevel || (this.level > this.maxLevel)) this.level = this.maxLevel;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    const rollData = {};
    for (const status of this.parent.statuses) rollData[status] = 1;
    return rollData;
  }

  /* -------------------------------------------------- */

  /**
   * Transform this condition into a formgroup for the start-of-round prompt.
   * @returns {HTMLElement}
   */
  toFormGroup() {
    const fg = document.createElement("DIV");
    fg.classList.add("form-group");

    const label = document.createElement("LABEL");
    label.textContent = this.parent.name;
    fg.appendChild(label);

    const ff = document.createElement("DIV");
    ff.classList.add("form-fields");
    fg.appendChild(ff);

    const input = document.createElement("INPUT");
    input.type = "checkbox";
    input.name = this.parent.uuid;
    input.setAttribute("checked", "");
    ff.appendChild(input);

    const hint = document.createElement("P");
    hint.classList.add("hint");
    hint.textContent = game.i18n.format(`ARTICHRON.CONDITIONS.FIELDS.${this.primary}.effect`, {
      actor: this.parent.parent.name,
      level: this.level,
    });
    fg.appendChild(hint);

    return fg;
  }

  /* -------------------------------------------------- */

  /**
   * Increase the level of a condition that has multiple stages.
   * @param {number} [levels]   Amount of levels to increase by.
   * @returns {Promise}
   */
  async increase(levels = 1) {
    const max = artichron.config.STATUS_CONDITIONS[this.primary].levels;
    if (!max || !(max > 1) || (this.level === max)) return;
    const disabled = this.parent.disabled;
    const diff = Math.min(max, this.level + levels) - this.level;
    await this.parent.update({
      "system.level": Math.min(max, this.level + levels),
      disabled: false,
    }, { statusLevelDifference: disabled ? undefined : diff });
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the level of a condition that has multiple stages.
   * It is the responsibility of the caller to delete the condition if it would go below level 1.
   * @returns {Promise}
   */
  async decrease() {
    const disabled = this.parent.disabled;
    const diff = (this.level - 1) - this.level;
    await this.parent.update({
      "system.level": this.level - 1,
      disabled: false,
    }, { statusLevelDifference: disabled ? undefined : diff });
  }

  /* -------------------------------------------------- */

  /**
   * Do whatever it may be that this condition might do to its owner.
   * @returns {Promise}
   */
  async execute() {
    switch (this.primary) {
      case "burning": return this.#executeBurning();
      case "bleeding": return this.#executeBleeding();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Execute the effects of the 'burning' condition.
   * @returns {Promise}
   */
  async #executeBurning() {
    const actor = this.parent.parent;
    const formula = "(@level)d12";
    const type = "fire";
    const roll = new CONFIG.Dice.DamageRoll(formula, { level: this.level }, { type: type });
    await roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.CONDITIONS.FIELDS.burning.flavor", { actor: actor.name }),
      sound: null,
    });
    return actor.system.applyDamage([{
      type: type,
      value: roll.total,
      options: {
        irreducible: true,
      },
    }]);
  }

  /* -------------------------------------------------- */

  /**
   * Execute the effects of the 'burning' condition.
   * @returns {Promise}
   */
  async #executeBleeding() {
    const actor = this.parent.parent;
    const formula = "(@level)d6";
    const type = "physical";
    const roll = new CONFIG.Dice.DamageRoll(formula, { level: this.level }, { type: type });
    await roll.toMessage({
      flavor: game.i18n.format("ARTICHRON.CONDITIONS.FIELDS.bleeding.flavor", { actor: actor.name }),
      sound: null,
    });
    return actor.system.applyDamage([{
      type: type,
      value: roll.total,
      options: {
        irreducible: true,
      },
    }]);
  }
}
