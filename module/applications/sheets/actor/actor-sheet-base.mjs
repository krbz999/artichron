import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

/**
 * Base actor sheet.
 * @extends {foundry.applications.sheets.ActorSheet}
 */
export default class ActorSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ActorSheet) {
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
  async _onRender(context, options) {
    await super._onRender(context, options);

    if (!this.isEditable) return;

    this.element.querySelectorAll("[data-action=updateEmbedded]").forEach(n => {
      n.addEventListener("change", this.#onUpdateEmbedded.bind(this));
    });
  }

  /* -------------------------------------------------- */
  /*   Drag and drop handlers                           */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropFolder(event, folder) {
    if (!this.document.isOwner || (folder.type !== "Item")) return;

    const contents = folder.contents.concat(folder.getSubfolders(true).flatMap(folder => folder.contents));
    for (let item of contents) {
      if (!(item instanceof foundry.documents.Item)) item = await foundry.utils.fromUuid(item.uuid);
      await this._onDropItem(event, item);
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onDropItem(event, item) {
    if (!this.document.isOwner) return;

    // Trigger advancements.
    advancement: if (item.supportsAdvancements) {
      const collection = item.getEmbeddedPseudoDocumentCollection("Advancement");
      if (!collection.size) break advancement;

      const itemData = await artichron.data.pseudoDocuments.advancements.BaseAdvancement.prepareItems(this.document, item);
      await foundry.utils.getDocumentClass("Item").create(itemData, { parent: this.document, keepId: true });
      return;
    }

    // Stack the item.
    if ((item.parent !== this.document) && item.system.identifier && item.system.schema.has("quantity")) {
      const existing = this.document.itemTypes[item.type].find(i => {
        return i.system.identifier === item.system.identifier;
      });
      if (existing) {
        await existing.update({ "system.quantity.value": existing.system.quantity.value + item.system.quantity.value });
        return;
      }
    }

    // Default behavior.
    return super._onDropItem(event, item);

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
    foundry.utils.getDocumentClass("Item").createDialog({}, { parent: this.document }, { types: types });
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
      case "pools": Cls = artichron.applications.apps.actor.HeroPoolConfig; break;
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
