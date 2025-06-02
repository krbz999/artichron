import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class AdvancementSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      deletePoolItem: AdvancementSheet.#deletePoolItem,
    },
    classes: ["advancement"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    ...super.PARTS,
    identity: {
      template: "systems/artichron/templates/sheets/item/advancement-sheet/identity.hbs",
      classes: ["tab", "standard-form"],
    },
    details: {
      template: "systems/artichron/templates/sheets/item/advancement-sheet/details.hbs",
      classes: ["tab", "standard-form"],
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The item that has this advancement.
   * @type {ItemArtichron}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * The advancement.
   * @type {BaseAdvancement}
   */
  get advancement() {
    return this.pseudoDocument;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    switch (partId) {
      case "identity":
        return this.#prepareIdentityContext(context, options);
      case "details":
        return this.#prepareDetailsContext(context, options);
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async #prepareIdentityContext(context, options) {
    context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async #prepareDetailsContext(context, options) {
    context.ctx = {
      itemPool: [],
    };

    for (const [i, pool] of this.pseudoDocument.pool.entries()) {
      const item = await fromUuid(pool.uuid);
      context.ctx.itemPool.push({
        ...pool,
        index: i,
        link: item ? item.toAnchor() : "Unknown Item",
      });
    }

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    if (!this.isEditable) return;
    new foundry.applications.ux.DragDrop.implementation({
      dropSelector: ".drop-target-area",
      callbacks: {
        drop: AdvancementSheet.#onDropTargetArea.bind(this),
      },
    }).bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle drop events in the pool area.
   * @param {DragEvent} event   The initiating drag event.
   */
  static async #onDropTargetArea(event) {
    const item = await fromUuid(foundry.applications.ux.TextEditor.implementation.getDragEventData(event).uuid);
    if (!item || (item.documentName !== "Item") || (item.type !== "talent")) return;
    const exists = this.pseudoDocument.pool.some(k => k.uuid === item.uuid);
    if (exists) return;
    const pool = foundry.utils.deepClone(this.pseudoDocument._source.pool);
    pool.push({ uuid: item.uuid, optional: !!pool.length && pool.every(p => p.optional) });
    this.pseudoDocument.update({ pool });
  }

  /* -------------------------------------------------- */

  /**
   * Delete an entry from the pool.
   * @this {AdvancementSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #deletePoolItem(event, target) {
    const index = Number(target.closest("[data-pool-index]").dataset.poolIndex);
    const pool = foundry.utils.deepClone(this.pseudoDocument._source.pool);
    pool.splice(index, 1);
    this.pseudoDocument.update({ pool });
  }
}
