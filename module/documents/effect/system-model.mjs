const {StringField, SchemaField} = foundry.data.fields;

/**
 * System data for ActiveEffects.
 * @property {object} expiration
 * @property {string} expiration.type     When does this effect automatically expire?
 */
export default class ActiveEffectSystemModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      expiration: new SchemaField({
        type: new StringField({
          required: true,
          initial: "none",
          choices: CONFIG.SYSTEM.EFFECT_EXPIRATION_TYPES,
          label: "ARTICHRON.EffectProperty.Expiration",
          hint: "ARTICHRON.EffectProperty.ExpirationHint"
        })
      })
    };
  }

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
    return this.expiration.type !== "none";
  }
}
