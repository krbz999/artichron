import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField } = foundry.data.fields;

export default class HealthRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      hint: "ARTICHRON.ITEM.REQUIREMENT.Health.hint",
      label: "ARTICHRON.ITEM.REQUIREMENT.Health.label",
    });
  }

  /* -------------------------------------------------- */
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
    if (this.item.actor?.type !== "hero") return true;
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
