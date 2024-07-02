import {ActorSystemModel} from "./system-model.mjs";

export default class MerchantData extends ActorSystemModel {
  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  async stageItem(item) {
    const items = this.stagedItems;
    items.add(item);
    await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    return true;
  }

  /* -------------------------------------------------- */

  async unstageItem(item) {
    const items = this.stagedItems;
    items.delete(item);
    await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    return true;
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

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
