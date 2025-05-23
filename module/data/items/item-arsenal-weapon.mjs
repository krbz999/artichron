import ArsenalData from "./item-arsenal.mjs";

const { SchemaField, StringField } = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaultWeight: 2,
      order: 10,
      type: "weapon",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ammunition: new SchemaField({
        type: new StringField({
          required: true,
          choices: artichron.config.AMMUNITION_TYPES,
          initial: "arrow",
        }),
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.WEAPON",
  ];

  /* -------------------------------------------------- */

  /**
   * Does this item use ammo?
   * @type {boolean}
   */
  get usesAmmo() {
    return this.attributes.value.has("ammunition");
  }
}
