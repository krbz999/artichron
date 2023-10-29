import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArsenal extends ItemSheetArtichron {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["arsenal", "sheet", "item", "artichron"]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = await super.getData();
    return data;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    // listeners that always work go here
    if (!this.isEditable) return;
  }
}
