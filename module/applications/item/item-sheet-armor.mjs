import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArmor extends ItemSheetArtichron {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["armor", "sheet", "item", "artichron"]
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
    // listeners that only work on editable or owned sheets go here
  }
}
