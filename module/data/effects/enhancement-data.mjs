import ActiveEffectSystemModel from "./system-model.mjs";

/**
 * System data for 'Enhancements'.
 * Enhancements are effects that apply to an item. They can live only on an item.
 */
export default class EffectEnhancementData extends ActiveEffectSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      type: "enhancement",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    if (this.parent.parent.documentName === "Actor") {
      ui.notifications.warn("Enhancements can only live on an item.");
      return false;
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.parent.transfer = false;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  getRollData() {
    return {};
  }
}
