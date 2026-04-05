import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField } = foundry.data.fields;

export default class HealthRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({ min: 0, integer: true }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "health";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.REQUIREMENT.HEALTH",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    const actor = this.document?.actor;
    if (actor?.type !== "hero") return true;
    return actor.system.health.value >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.REQUIREMENT.HEALTH.content", {
      value: this.value ?? 0,
    });
  }
}
