import PseudoDocumentSheet from "../../api/pseudo-document-sheet.mjs";

export default class AdvancementSheet extends PseudoDocumentSheet {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      deletePoolItem: AdvancementSheet.#deletePoolItem,
      removeScaleIncrease: AdvancementSheet.#removeScaleIncrease,
    },
    classes: ["advancement"],
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    identity: {
      template: "systems/artichron/templates/sheets/pseudo/advancement/identity.hbs",
      classes: ["tab", "standard-form"],
    },
    details: {
      template: "systems/artichron/templates/sheets/pseudo/advancement/details.hbs",
      classes: ["tab", "standard-form"],
      scrollable: [".increases.scrollable"],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "identity", icon: "fa-solid fa-tag" },
        { id: "details", icon: "fa-solid fa-pen-fancy" },
      ],
      initial: "identity",
      labelPrefix: "ARTICHRON.SHEET.TABS",
    },
  };

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextIdentity(context, options) {
    const ctx = context.ctx = {};
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDetails(context, options) {
    const ctx = context.ctx = {};

    if (context.pseudoDocument.type === "itemGrant") {
      ctx.itemPool = [];
      for (const [i, pool] of this.pseudoDocument.pool.entries()) {
        const item = await fromUuid(pool.uuid);
        ctx.itemPool.push({
          ...pool,
          index: i,
          link: item ? item.toAnchor() : "Unknown Item",
        });
      }
    }

    else if (context.pseudoDocument.type === "scaleValue") {
      ctx.faces = context.pseudoDocument.subtype === "dice";
      ctx.increases = artichron.utils.sortObject(context.source.increases, { inplace: false });
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

    const newIncrease = this.element.querySelector("[data-new-increase]");
    if (newIncrease) newIncrease.addEventListener("change", () => {
      if (!newIncrease.value) return;
      const value = Number(newIncrease.value);
      if (value in this.pseudoDocument.increases) return;
      this.pseudoDocument.update({ [`increases.${value}`]: null });
    });
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
    const advancement = this.pseudoDocument;
    const exists = advancement.pool.some(k => k.uuid === item.uuid);
    if (exists) return;
    const pool = foundry.utils.deepClone(advancement._source.pool);
    pool.push({ uuid: item.uuid, optional: !!pool.length && pool.every(p => p.optional) });
    advancement.update({ pool });
  }

  /* -------------------------------------------------- */

  /**
   * Delete an entry from the pool.
   * @this {AdvancementSheet}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static async #deletePoolItem(event, target) {
    const advancement = this.pseudoDocument;
    const index = Number(target.closest("[data-pool-index]").dataset.poolIndex);
    const pool = foundry.utils.deepClone(advancement._source.pool);
    pool.splice(index, 1);
    advancement.update({ pool });
  }

  /* -------------------------------------------------- */

  static async #removeScaleIncrease(event, target) {
    this.pseudoDocument.update({ [`increases.-=${target.closest("[data-increase]").dataset.increase}`]: null });
  }
}
