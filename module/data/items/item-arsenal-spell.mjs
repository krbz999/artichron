import ArsenalData from "./item-arsenal.mjs";

export default class SpellData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaultWeight: 1,
      order: 30,
      type: "spell",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      ...super.defineSchema(),
    };
  }
}
