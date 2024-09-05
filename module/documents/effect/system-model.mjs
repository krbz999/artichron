const {StringField} = foundry.data.fields;

/**
 * System data for ActiveEffects.
 * @property {string} expiration      When does this effect automatically expire?
 */
export default class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      expiration: new StringField({
        required: true,
        initial: "none",
        choices: CONFIG.SYSTEM.EFFECT_EXPIRATION_TYPES
      })
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.EFFECT"
  ];

  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData(options = {}) {
    throw new Error("The 'getRollData' method of active effects must be subclassed.");
  }

  /* -------------------------------------------------- */

  /**
   * Describe whether the ActiveEffect has a temporary duration based on when it expires.
   * @type {boolean}
   */
  get isTemporary() {
    return this.expiration !== "none";
  }
}
