import BaseAdvancement from "./base-advancement.mjs";

const { NumberField, SchemaField, TypedObjectField } = foundry.data.fields;

export default class TraitAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      traits: new TypedObjectField(new NumberField()),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "trait";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.TRAIT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [this.requirements.points];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async configureNode(node) {
    return false;
  }
}
