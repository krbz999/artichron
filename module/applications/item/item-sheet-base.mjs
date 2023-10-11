/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class ItemSheetArtichron extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 400,
      height: 500,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}],
      classes: ["sheet", "item", "artichron"]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/item/item-sheet-${this.document.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const rollData = this.document.getRollData();
    const data = {
      item: this.document,
      actor: this.document.actor,
      system: this.document.system,
      context: {},
      rollData: rollData,
      config: CONFIG.SYSTEM,
      descriptions: {
        value: await TextEditor.enrichHTML(this.document.system.description.value, {rollData, async: true})
      }
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
