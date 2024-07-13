import {ArtichronSheetMixin} from "../base-sheet.mjs";
import PoolConfig from "./pool-config.mjs";

export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["artichron", "actor"],
    position: {height: "auto"},
    actions: {
      createItem: this._onCreateItem,
      useItem: this._onUseItem,
      editItem: this._onEditItem,
      favoriteItem: this._onFavoriteItem,
      deleteItem: this._onDeleteItem,
      recoverHealth: this._onRecoverHealth,
      toggleConfig: this._onToggleConfig,
      fuseItem: this._onFuseItem
    }
  };

  /* -------------------------------------------------- */
  /*   Rendering                                        */
  /* -------------------------------------------------- */

  /**
   * Prepare the items for rendering.
   * @returns {Promise<object>}
   */
  async _prepareItems() {
    return {};
  }

  /* -------------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.isEditable) return;

    this.element.querySelectorAll("[data-action=updateEmbedded").forEach(n => {
      n.addEventListener("change", this._onUpdateEmbedded.bind(this));
    });
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to create an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onCreateItem(event, target) {
    if (!this.isEditable) return;
    const section = target.dataset.section;
    const types = section ? Object.entries(CONFIG.Item.dataModels).reduce((acc, [type, cls]) => {
      if (cls.metadata.inventorySection === section) {
        acc.push(type);
      }
      return acc;
    }, []) : undefined;
    getDocumentClass("Item").createDialog({}, {types: types, parent: this.document});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to use an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onUseItem(event, target) {
    if (!this.isEditable) return;
    event.stopPropagation();
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.use();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render an item's sheet.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onEditItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.sheet.render(true);
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to delete an item.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onDeleteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.deleteDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to toggle an item's Favorited state.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onFavoriteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    this.document.toggleFavoriteItem(item.id);
  }

  /* -------------------------------------------------- */

  /**
   * Handle the change events on input fields that should propagate to the embedded document.
   * @param {Event} event             The initiating change event.
   */
  async _onUpdateEmbedded(event) {
    if (!this.isEditable) return;
    const target = event.currentTarget;
    const property = target.dataset.property;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    const result = artichron.utils.parseInputDelta(target, item);
    if (result !== undefined) {
      if (property === "system.usage.value") {
        item.update(item.system._usageUpdate(result, false));
      } else item.update({[property]: result});
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render a configuration menu.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onToggleConfig(event, target) {
    if (!this.isEditable) return;
    let Cls;
    switch (target.dataset.trait) {
      case "pools": Cls = PoolConfig; break;
    }
    new Cls({document: this.document}).render({force: true});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to restore the actor's hit points and other resources.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static _onRecoverHealth(event, target) {
    if (!this.isEditable) return;
    this.document.recover();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to fuse one item onto another.
   * @param {Event} event             The initiating click event.
   * @param {HTMLElement} target      The current target of the event listener.
   */
  static async _onFuseItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.fuseDialog();
  }
}
