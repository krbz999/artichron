import ArtichronSheetMixin from "../base-sheet.mjs";
import PoolConfig from "./pool-config.mjs";

export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["actor"],
    position: { height: 700 },
    window: { resizable: true },
    actions: {
      createItem: ActorSheetArtichron.#onCreateItem,
      useItem: ActorSheetArtichron.#onUseItem,
      editItem: ActorSheetArtichron.#onEditItem,
      favoriteItem: ActorSheetArtichron.#onFavoriteItem,
      deleteItem: ActorSheetArtichron.#onDeleteItem,
      recoverHealth: ActorSheetArtichron.#onRecoverHealth,
      toggleConfig: ActorSheetArtichron.#onToggleConfig,
      fuseItem: ActorSheetArtichron.#onFuseItem,
    },
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

  /** @inheritdoc */
  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.isEditable) return;

    this.element.querySelectorAll("[data-action=updateEmbedded]").forEach(n => {
      n.addEventListener("change", this.#onUpdateEmbedded.bind(this));
    });
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to create an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onCreateItem(event, target) {
    if (!this.isEditable) return;
    const section = target.dataset.section;
    const types = section ? Object.entries(CONFIG.Item.dataModels).reduce((acc, [type, cls]) => {
      if (cls.metadata.inventorySection === section) {
        acc.push(type);
      }
      return acc;
    }, []) : undefined;
    getDocumentClass("Item").createDialog({}, { types: types, parent: this.document });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to use an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onUseItem(event, target) {
    if (!this.isEditable) return;
    event.stopPropagation();
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.use({}, { event: event }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render an item's sheet.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onEditItem(event, target) {
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.sheet.render(true);
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to delete an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onDeleteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.deleteDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to toggle an item's Favorited state.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onFavoriteItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    this.document.toggleFavoriteItem(item.id);
  }

  /* -------------------------------------------------- */

  /**
   * Handle the change events on input fields that should propagate to the embedded document.
   * @param {PointerEvent} event      The originating click event..
   */
  async #onUpdateEmbedded(event) {
    if (!this.isEditable) return;
    const target = event.currentTarget;
    const property = target.dataset.property;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    const result = artichron.utils.parseInputDelta(target, item);
    if (result !== undefined) {
      if (property === "system.usage.value") {
        item.update(item.system._usageUpdate(result, false));
      } else item.update({ [property]: result });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render a configuration menu.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onToggleConfig(event, target) {
    if (!this.isEditable) return;
    let Cls;
    switch (target.dataset.trait) {
      case "pools": Cls = PoolConfig; break;
    }
    new Cls({ document: this.document }).render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to restore the actor's hit points and other resources.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #onRecoverHealth(event, target) {
    if (!this.isEditable) return;
    this.document.recover();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to fuse one item onto another.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static async #onFuseItem(event, target) {
    if (!this.isEditable) return;
    const uuid = target.closest("[data-item-uuid]").dataset.itemUuid;
    const item = await fromUuid(uuid);
    item.fuseDialog();
  }
}
