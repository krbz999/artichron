import ActorSystemModel from "./system-model.mjs";

export default class MerchantData extends ActorSystemModel {
  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();

    // Set health maximum and clamp current health.
    const injury = 1 - this.parent.appliedConditionLevel("injured") / 100;
    this.health.max = Math.ceil(this.health.max * injury);
    this.health.value = Math.clamp(this.health.value, 0, this.health.max);
    this.health.pct = Math.round(this.health.value / this.health.max * 100);
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Move an item from the stock area to the cart area.
   * @param {ItemArtichron} item      The item to move.
   * @returns {Promise<boolean>}      Whether the item was moved.
   */
  async stageItem(item) {
    const items = this.stagedItems;
    const bool = items.has(item);
    if (!bool) {
      items.add(item);
      await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    }
    return !bool;
  }

  /* -------------------------------------------------- */

  /**
   * Move an item from the cart area to the stock area.
   * @param {ItemArtichron} item      The item to move.
   * @returns {Promise<boolean>}      Whether the item was moved.
   */
  async unstageItem(item) {
    const items = this.stagedItems;
    const bool = items.has(item);
    if (bool) {
      items.delete(item);
      await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    }
    return bool;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The items that are currently in the 'cart' area.
   * @type {Set<ItemArtichron>}
   */
  get stagedItems() {
    const ids = this.parent.getFlag("artichron", "stagedItems") ?? [];
    const items = new Set();
    for (const id of ids) {
      const item = this.parent.items.get(id);
      if (item) items.add(item);
    }
    return items;
  }
}
