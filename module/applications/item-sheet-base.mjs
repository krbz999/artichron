/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetBase extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 520,
      height: 480,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/item-sheet-${this.document.type}.hbs`;
  }

  /** @override */
  get classes() {
    return [this.document.type, "sheet", "item", "artichron"];
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = {
      item: this.document,
      actor: this.document.actor,
      context: {},
      rollData: this.document.getRollData()
    };
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
