import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField } = foundry.data.fields;

export default class LevelRequirement extends BaseArmorRequirement {
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
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      hint: "ARTICHRON.ITEM.REQUIREMENT.Level.hint",
    });
  }

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
    if (this.item.actor?.type !== "hero") return true;
    // return this.item.actor.system.progression.level >= this.level;
    return false;
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
