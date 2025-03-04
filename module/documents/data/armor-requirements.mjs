import PseudoDocument from "./pseudo-document.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class ArmorRequirementData extends PseudoDocument {
  /** @inheritdoc */
  static metadata = Object.freeze({
    documentName: "ArmorRequirement",
    label: "",
    hint: "",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPES() {
    return {
      [HealthRequirementData.TYPE]: HealthRequirementData,
      [LevelRequirementData.TYPE]: LevelRequirementData,
      [PoolRequirementData.TYPE]: PoolRequirementData,
      [SkillRequirementData.TYPE]: SkillRequirementData,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get _path() {
    return "system.category.requirements";
  }

  /* -------------------------------------------------- */

  /**
   * The item this data model is embedded on.
   * @type {ItemArtichron}
   */
  get item() {
    return this.document;
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

/* -------------------------------------------------- */

class PoolRequirementData extends ArmorRequirementData {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      pool: new StringField({
        required: true,
        initial: "stamina",
        choices: artichron.config.POOL_TYPES,
      }),
      value: new NumberField({
        min: 2,
        initial: 2,
        integer: true,
        nullable: false,
        placeholder: "ARTICHRON.ITEM.REQUIREMENT.Pool.FIELDS.value.placeholder",
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    label: "ARTICHRON.ITEM.REQUIREMENT.Pool.label",
    hint: "ARTICHRON.ITEM.REQUIREMENT.Pool.hint",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "pool";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM.ArmorRequirement",
    "ARTICHRON.ITEM.REQUIREMENT.Pool",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    if (this.item.actor.type !== "hero") return true;
    return this.item.actor.system.pools[this.pool].max >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ITEM.REQUIREMENT.Pool.content", {
      value: this.value,
      pool: artichron.config.POOL_TYPES[this.pool].label,
    });
  }
}

/* -------------------------------------------------- */

class HealthRequirementData extends ArmorRequirementData {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({
        min: 0,
        initial: 0,
        integer: true,
        nullable: false,
        placeholder: "ARTICHRON.ITEM.REQUIREMENT.Health.FIELDS.value.placeholder",
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    label: "ARTICHRON.ITEM.REQUIREMENT.Health.label",
    hint: "ARTICHRON.ITEM.REQUIREMENT.Health.hint",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "health";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM.ArmorRequirement",
    "ARTICHRON.ITEM.REQUIREMENT.Health",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    if (this.item.actor.type !== "hero") return true;
    return this.item.actor.system.health.value >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ITEM.REQUIREMENT.Health.content", {
      value: this.value,
    });
  }
}

/* -------------------------------------------------- */

class SkillRequirementData extends ArmorRequirementData {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      skill: new StringField({
        required: true,
        choices: artichron.config.SKILLS,
        initial: "agility",
      }),
      value: new NumberField({
        min: 2,
        initial: 2,
        integer: true,
        nullable: false,
        placeholder: "ARTICHRON.ITEM.REQUIREMENT.Skill.FIELDS.value.placeholder",
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    label: "ARTICHRON.ITEM.REQUIREMENT.Skill.label",
    hint: "ARTICHRON.ITEM.REQUIREMENT.Skill.hint",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "skill";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM.ArmorRequirement",
    "ARTICHRON.ITEM.REQUIREMENT.Skill",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    if (this.item.actor.type !== "hero") return true;
    return this.item.actor.system.skills[this.skill].number >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.ITEM.REQUIREMENT.Skill.content", {
      skill: artichron.config.SKILLS[this.skill].label,
      value: this.value,
    });
  }
}

/* -------------------------------------------------- */

class LevelRequirementData extends ArmorRequirementData {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      level: new NumberField({
        initial: () => artichron.config.PROGRESSION_THRESHOLDS[0].level,
        nullable: false,
        choices: () => artichron.config.PROGRESSION_THRESHOLDS.reduce((acc, v) => {
          acc[v.level] = v.label;
          return acc;
        }, {}),
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static metadata = Object.freeze({
    label: "ARTICHRON.ITEM.REQUIREMENT.Level.label",
    hint: "ARTICHRON.ITEM.REQUIREMENT.Level.hint",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "level";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.ITEM.ArmorRequirement",
    "ARTICHRON.ITEM.REQUIREMENT.Level",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    if (this.item.actor.type !== "hero") return true;
    return this.item.actor.system.progression.level >= this.level;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    const progression = artichron.config.PROGRESSION_THRESHOLDS.toReversed().find(p => {
      return p.level <= this.level;
    });

    return game.i18n.format("ARTICHRON.ITEM.REQUIREMENT.Level.content", {
      value: progression.label,
    });
  }
}
