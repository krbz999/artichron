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
        choices: CONFIG.SYSTEM.POOL_TYPES
      }),
      value: new NumberField({
        min: 0,
        integer: true,
        placeholder: "ARTICHRON.ItemProperty.ArmorRequirement.Pool.FIELDS.value.placeholder"
      })
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static metadata = Object.freeze({
    label: "ARTICHRON.ItemProperty.ArmorRequirement.Pool.label",
    hint: "ARTICHRON.ItemProperty.ArmorRequirement.Pool.hint"
  });

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "pool";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ItemProperty.ArmorRequirement",
    "ARTICHRON.ItemProperty.ArmorRequirement.Pool"
  ];

  /* -------------------------------------------------- */

  /** @override */
  get fulfilledRequirements() {
    return !!(this.item.actor?.system.pools?.[this.pool].faces >= this.value);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @override */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ItemProperty.ArmorRequirement.Pool.content", {
      value: this.value,
      pool: CONFIG.SYSTEM.POOL_TYPES[this.pool].label
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
        placeholder: "ARTICHRON.ItemProperty.ArmorRequirement.Health.FIELDS.value.placeholder"
      })
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @override */
  static metadata = Object.freeze({
    label: "ARTICHRON.ItemProperty.ArmorRequirement.Health.label",
    hint: "ARTICHRON.ItemProperty.ArmorRequirement.Health.hint"
  });

  /* -------------------------------------------------- */

  /** @override */
  static TYPE = "health";

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ItemProperty.ArmorRequirement",
    "ARTICHRON.ItemProperty.ArmorRequirement.Health"
  ];

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
    return game.i18n.format("ARTICHRON.ItemProperty.ArmorRequirement.Health.content", {
      value: this.value
    });
  }
}
