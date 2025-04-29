export default class CombatantSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Metadata for this datamodel.
   * @type {import("../../_types").CombatantSubtypeMetadata}
   */
  static get metadata() {
    return {
      embedded: {},
      icon: "",
      type: "artichron",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {};
  }
}
