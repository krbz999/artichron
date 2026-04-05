import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField } = foundry.data.fields;

export default class LevelRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({ integer: true, min: 0 }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "level";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.REQUIREMENT.LEVEL",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    const actor = this.document.actor;
    if (actor?.type !== "hero") return true;
    return Object.values(actor.system.progression.paths).reduce((acc, path) => acc + path.invested, 0) >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.REQUIREMENT.LEVEL.content", {
      value: this.value ?? 0,
    });
  }
}
