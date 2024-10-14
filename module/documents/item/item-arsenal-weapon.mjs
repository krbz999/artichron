import ArsenalData from "./item-arsenal.mjs";

const {SchemaField, StringField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    order: 10,
    type: "weapon"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ammunition: new SchemaField({
        type: new StringField({
          required: true,
          choices: CONFIG.SYSTEM.AMMUNITION_TYPES,
          initial: "arrow"
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ITEM.WEAPON"
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
