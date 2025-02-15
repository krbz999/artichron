import ActiveEffectSystemModel from "./system-model.mjs";

/**
 * System data for 'Enhancements'.
 * Enhancements are effects that apply to an item. They can live only on an item.
 */
export default class EffectEnhancementData extends ActiveEffectSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActiveEffectSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "enhancement",
  });

  /* -------------------------------------------------- */

  /** @override */
  async _preCreate(...T) {
    const allowed = await super._preCreate(...T);
    if (allowed === false) return false;

    if (this.parent.parent.documentName === "Actor") {
      ui.notifications.warn("Enhancements can only live on an item.");
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */

  /** @override */
  getRollData() {
    return {};
  }
}
