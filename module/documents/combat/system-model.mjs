export default class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").CombatantSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "artichron"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {};
  }
}
