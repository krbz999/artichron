import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class PoolRequirement extends BaseArmorRequirement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      pool: new StringField({
        required: true,
        initial: "stamina",
        choices: () => artichron.config.POOL_TYPES,
      }),
      value: new NumberField({ min: 2, initial: 2, integer: true, nullable: false }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "pool";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.REQUIREMENT.POOL",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get fulfilledRequirements() {
    const actor = this.document.actor;
    if (actor?.type !== "hero") return true;
    return actor.system.pools[this.pool].max >= this.value;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  toRequirement() {
    return game.i18n.format("ARTICHRON.REQUIREMENT.POOL.content", {
      pool: artichron.config.POOL_TYPES[this.pool].label,
      value: this.value,
    });
  }
}
