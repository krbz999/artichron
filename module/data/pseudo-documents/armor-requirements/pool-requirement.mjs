import BaseArmorRequirement from "./base-armor-requirement.mjs";

const { NumberField, StringField } = foundry.data.fields;

export default class PoolRequirement extends BaseArmorRequirement {
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
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      hint: "ARTICHRON.ITEM.REQUIREMENT.Pool.hint",
      label: "ARTICHRON.ITEM.REQUIREMENT.Pool.label",
    });
  }

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
    if (this.item.actor?.type !== "hero") return true;
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
