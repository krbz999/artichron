/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class ActorSheetArtichron extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes"}],
      classes: ["sheet", "actor", "artichron"]
    });
  }

  /** @override */
  get template() {
    return `systems/artichron/templates/actor/actor-sheet-${this.document.type}.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = {
      actor: this.document,
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
