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
    html[0].querySelectorAll("[data-action]").forEach(n => {
      const action = n.dataset.action;
      switch (action) {
        case "edit-item":
          n.addEventListener("click", this._onClickRenderItemSheet.bind(this));
          break;
        default:
          break;
      }
    });
  }

  /**
   * Handle clicking an edit button to render an item's sheet.
   * @param {PointerEvent} event      The initiating click event.
   * @returns {ItemSheet}             The sheet of the item.
   */
  async _onClickRenderItemSheet(event) {
    const id = event.currentTarget.dataset.id;
    const item = this.document.items.get(id);
    return item.sheet.render(true);
  }

}
