const {NumberField, StringField} = foundry.data.fields;

export default class ArmorRequirementData extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      type: new StringField({
        required: true,
        blank: false,
        initial: this.TYPE,
        validate: value => value === this.TYPE,
        validationError: `must be equal to "${this.TYPE}"`,
        choices: () => Object.entries(ArmorRequirementData.TYPES).reduce((acc, [k, v]) => {
          acc[k] = v.metadata.label;
          return acc;
        }, {})
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Object of metadata for this data model.
   * @type {object}
   */
  static metadata = Object.freeze({
    label: "",
    hint: ""
  });

  /* -------------------------------------------------- */

  /**
   * The type property of this data model.
   * @type {string}
   */
  static TYPE = "";

  /* -------------------------------------------------- */

  /**
   * The valid types of values for requirements.
   * @type {Record<string, ArmorRequirementData>}
   */
  static get TYPES() {
    return {
      [HealthRequirementData.TYPE]: HealthRequirementData,
      [PoolRequirementData.TYPE]: PoolRequirementData
    };
  }

  /* -------------------------------------------------- */

  /**
   * The item this data model is embedded on.
   * @type {ItemArtichron}
   */
  get item() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Does the actor who owns this item fulfill these requirements?
   * @type {boolean}
   */
  get fulfilledRequirements() {
    return false;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Convert this requirement to a human-readable string.
   * @returns {string}      The content.
   */
  toRequirement() {
    return "";
  }
}

class PoolRequirementData extends ArmorRequirementData {
  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      pool: new StringField({
        required: true,
        initial: "stamina",
        choices: {
          health: "Health",
          stamina: "Stamina",
          mana: "Mana"
        }
      }),
      value: new NumberField({
        min: 0,
        integer: true,
        placeholder: "ARTICHRON.ItemProperty.ArmorRequirement.PoolValuePlaceholder"
      })
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static metadata = Object.freeze({
    label: "ARTICHRON.ItemProperty.ArmorRequirement.Pool",
    hint: "ARTICHRON.ItemProperty.ArmorRequirement.PoolHint"
  });

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "pool";

  /* -------------------------------------------------- */

  /** @override */
  get fulfilledRequirements() {
    return !!(this.item.actor?.system.pools?.[this.pool].max >= this.value);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ItemProperty.ArmorRequirement.PoolContent", {
      value: this.value,
      pool: game.i18n.localize(`ARTICHRON.ActorProperty.FIELDS.pools.${this.pool}.max.label`)
    });
  }
}

class HealthRequirementData extends ArmorRequirementData {
  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({
        min: 0,
        integer: true,
        placeholder: "ARTICHRON.ItemProperty.ArmorRequirement.HealthValuePlaceholder"
      })
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static metadata = Object.freeze({
    label: "ARTICHRON.ItemProperty.ArmorRequirement.Health",
    hint: "ARTICHRON.ItemProperty.ArmorRequirement.HealthHint"
  });

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "health";

  /* -------------------------------------------------- */

  /** @override */
  get fulfilledRequirements() {
    return !!(this.item.actor?.system.health?.value >= this.value);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ItemProperty.ArmorRequirement.HealthContent", {
      value: this.value
    });
  }
}
