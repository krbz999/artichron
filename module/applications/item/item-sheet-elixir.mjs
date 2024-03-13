import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetElixir extends ItemSheetArtichron {

  /** @override */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.classes.push("elixir");
    return options;
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
