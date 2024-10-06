import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    order: 20,
    type: "shield"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: "buckler",
          choices: CONFIG.SYSTEM.SHIELD_TYPES
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value"
    ]));
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.SHIELD"
  ];
}
