import BaseTraitChoice from "./base-trait-choice.mjs";

const { NumberField } = foundry.data.fields;

export default class HealthChoice extends BaseTraitChoice {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({ min: 1, initial: 1, nullable: false, integer: true }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "health";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  toString() {
    return game.i18n.format("ARTICHRON.TRAIT_CHOICE.HINT.health", { increase: this.value.signedString() });
  }
}
