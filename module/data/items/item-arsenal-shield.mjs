import ArsenalData from "./item-arsenal.mjs";

const { SchemaField, StringField } = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaultWeight: 2,
      order: 20,
      type: "shield",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: "buckler",
          choices: artichron.config.SHIELD_TYPES,
        }),
      }),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value",
    ]));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.SHIELD",
  ];
}
