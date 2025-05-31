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
      renderEmbeddedDocumentSheet: ActorSheetArtichron.#renderEmbeddedDocumentSheet,
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

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    Object.assign(context, {
      config: artichron.config,
      systemFields: this.document.system.schema.fields,
      source: this.document._source,
      isPlayMode: this.isPlayMode,
      isEditMode: this.isEditMode,
    });

    return context;
  }

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
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Add context menu for effects.
    this._createContextMenu(
      this.#getContextOptionsActiveEffect,
      ".document-list.effects button[data-id]",
      { hookName: "ActiveEffectEntryContext" },
    );

    // Add context menu for items.
    this._createContextMenu(
      this.#getContextOptionsItem,
      "inventory-item",
      { hookName: "ItemEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for ActiveEffects.
   * @returns {object[]}
   */
  #getContextOptionsActiveEffect() {
    if (!this.document.isOwner) return [];
    const getEffect = btn => {
      const parentId = btn.dataset.parentId;
      if (parentId) return this.document.items.get(parentId).effects.get(btn.dataset.id);
      return this.document.effects.get(btn.dataset.id);
    };

    return [{
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: btn => getEffect(btn).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: btn => getEffect(btn).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.enable",
      icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
      condition: btn => getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: false }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.EFFECT.disable",
      icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
      condition: btn => !getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: true }),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for items.
   * @returns {object[]}
   */
  #getContextOptionsItem() {
    if (!this.document.isOwner) return [];
    const getItem = el => el.item;

    return [{
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: el => getItem(el).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      callback: el => getItem(el).hasGrantedItems ? getItem(el).advancementDeletionPrompt() : getItem(el).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.equip",
      icon: "<i class='fa-solid fa-fw fa-shield'></i>",
      condition: el => getItem(el).system.canEquip,
      callback: el => getItem(el).system.equip(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unequip",
      icon: "<i class='fa-solid fa-fw fa-shield-halved'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isEquipped,
      callback: el => getItem(el).system.unequip(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.favorite",
      icon: "<i class='fa-solid fa-fw fa-star'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && !getItem(el).isFavorite,
      callback: el => this.document.addFavoriteItem(getItem(el).id),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unfavorite",
      icon: "<i class='fa-regular fa-fw fa-star'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isFavorite,
      callback: el => this.document.removeFavoriteItem(getItem(el).id),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.fuse",
      icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).hasFusions && !getItem(el).isFused,
      callback: el => getItem(el).fuseDialog(),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ACTOR.CONTEXT.ITEM.unfuse",
      icon: "<i class='fa-solid fa-fw fa-recycle'></i>",
      condition: el => ["hero", "monster"].includes(this.document.type) && getItem(el).isFused,
      callback: el => getItem(el).system.fusion.unfuseDialog(),
      group: "action",
    }];
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

  /**
   * Helper method to retrieve an embedded document (possibly a grandchild).
   * @param {HTMLElement} element   An element able to find [data-id] and optionally [data-parent-id].
   * @returns {foundry.documents.Item|foundry.documents.ActiveEffect}   The embedded document.
   */
  #getEmbeddedDocument(element) {
    let embedded;
    const { parentId, id } = element.closest("[data-id]")?.dataset ?? {};
    if (parentId) {
      embedded = this.document.items.get(parentId).effects.get(id);
    } else {
      embedded = this.document.getEmbeddedCollection(element.closest("[data-document-name]").dataset.documentName).get(id);
    }
    return embedded;
  }

  /* -------------------------------------------------- */
  /*   Event Handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle click events to create an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #onUseItem(event, target) {
    if (!this.isEditable) return;
    event.stopPropagation();
    const item = this.#getEmbeddedDocument(target);
    item.use({}, { event: event }, {});
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to render an item's sheet.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #renderEmbeddedDocumentSheet(event, target) {
    this.#getEmbeddedDocument(target).sheet.render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to delete an item.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #onDeleteItem(event, target) {
    const item = this.#getEmbeddedDocument(target);
    if (item.hasGrantedItems) item.advancementDeletionPrompt();
    else item.deleteDialog();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to toggle an item's Favorited state.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #onFavoriteItem(event, target) {
    const item = this.#getEmbeddedDocument(target);
    this.document.toggleFavoriteItem(item.id);
  }

  /* -------------------------------------------------- */

  /**
   * Handle the change events on input fields that should propagate to the embedded document.
   * @param {PointerEvent} event    The initiating click event.
   */
  async #onUpdateEmbedded(event) {
    if (!this.isEditable) return;
    const target = event.currentTarget;
    const property = target.dataset.property;
    const item = this.#getEmbeddedDocument(target);
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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #onRecoverHealth(event, target) {
    if (!this.isEditable) return;
    this.document.recover();
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events to fuse one item onto another.
   * @this {ActorSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #onFuseItem(event, target) {
    const item = this.#getEmbeddedDocument(target);
    item.fuseDialog();
  }
}
