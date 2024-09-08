import ArsenalData from "./item-arsenal.mjs";

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
      ...super.defineSchema()
    };
  }
}
