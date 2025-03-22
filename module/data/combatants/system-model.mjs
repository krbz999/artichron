export default class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").CombatantSystemModelMetadata}
   */
  static get metadata() {
    return {
      type: "artichron",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {};
  }
}
