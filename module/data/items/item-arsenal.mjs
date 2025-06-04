import ItemSystemModel from "./system-model.mjs";

export default class ArsenalData extends ItemSystemModel {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {});
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * Is this a one-handed item?
   * @type {boolean}
   */
  get isOneHanded() {
    return !this.attributes.value.has("twoHanded");
  }

  /* -------------------------------------------------- */

  /**
   * Is this a two-handed item?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.attributes.value.has("twoHanded");
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to make an attack due to action point cost?
   * @type {boolean}
   */
  get canUsePips() {
    return this.parent.actor.canPerformActionPoints(this.cost.value);
  }

  /* -------------------------------------------------- */

  /**
   * Can this item be used to defend?
   * @type {boolean}
   */
  get canDefend() {
    const attr = this.attributes.value;
    if (!attr.has("parrying") && !attr.has("blocking")) return false;
    return this.activities.getByType("defend").length > 0;
  }
}
