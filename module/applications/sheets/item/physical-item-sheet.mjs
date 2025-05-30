import ItemSheetArtichron from "./item-sheet-base.mjs";

/**
 * Physical item sheet that extends the base item sheet. For item types that can have
 * activities, or can fuse, or can support effects.
 */
export default class PhysicalItemSheet extends ItemSheetArtichron {
  /** @inheritdoc */
  static PARTS = {
    header: {
      template: "systems/artichron/templates/sheets/item/item-sheet/header.hbs",
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    description: {
      template: "systems/artichron/templates/sheets/item/item-sheet/description.hbs",
      scrollable: [""],
    },
    details: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/details.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
    effects: {
      template: "systems/artichron/templates/sheets/item/item-sheet/physical/effects.hbs",
      classes: ["scrollable"],
      scrollable: [""],
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _prepareTabs(group) {
    const tabs = super._prepareTabs(group);
    delete tabs.advancements;
    return tabs;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextDetails(context, options) {
    context.ctx = {
      attributes: context.isPlayMode ? context.source.system.attributes.value : context.document.system.attributes.value,
    };
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextEffects(context, options) {
    const fusions = { active: [], inactive: [] };
    const enhancements = [];
    const buffs = [];

    for (const effect of this.document.effects) {
      const data = {
        effect,
        isExpanded: this._expandedItems.has(effect.uuid),
      };
      if (data.isExpanded) {
        data.enrichedText = await foundry.applications.ux.TextEditor.implementation.enrichHTML(effect.description, {
          relativeTo: effect, rollData: effect.getRollData(),
        });
      }

      if (effect.isActiveFusion) fusions.active.push(data);
      else if (effect.isTransferrableFusion) fusions.inactive.push(data);
      else if (effect.type === "enhancement") enhancements.push(data);
      else if (effect.type === "buff") buffs.push(data);
    }

    const sort = (a, b) => {
      const sort = a.effect.sort - b.effect.sort;
      if (sort) return sort;
      return a.effect.name.localeCompare(b.effect.name);
    };

    fusions.active.sort(sort);
    fusions.inactive.sort(sort);
    enhancements.sort(sort);
    buffs.sort(sort);

    Object.assign(context, { ctx: { effects: { fusions, enhancements, buffs } } });

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);

    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      dropSelector: null,
      permissions: {
        dragstart: this.#canDragStart.bind(this),
        drop: this.#canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this.#onDragStart.bind(this),
        dragover: this.#onDragOver.bind(this),
        drop: this.#onDrop.bind(this),
      },
    }).bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Drag & Drop                                      */
  /* -------------------------------------------------- */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector.
   * @param {string} selector   The candidate HTML selector for dragging.
   * @returns {boolean}         Can the current user drag this selector?
   */
  #canDragStart(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------------- */

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
   * @param {string} selector   The candidate HTML selector for the drop target.
   * @returns {boolean}         Can the current user drop on this selector?
   */
  #canDragDrop(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------------- */

  /**
   * An event that occurs when a drag workflow begins for a draggable item on the sheet.
   * @param {DragEvent} event   The initiating drag event.
   * @returns {Promise<void>}
   */
  async #onDragStart(event) {
    const li = event.currentTarget;
    if ("link" in event.target.dataset) return;
    let dragData;

    // Active Effect
    if (li.dataset.effectId) {
      const effect = this.document.effects.get(li.dataset.effectId);
      dragData = effect.toDragData();
    }

    // Set data transfer
    if (!dragData) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /* -------------------------------------------------- */

  /**
   * An event that occurs when a drag workflow moves over a drop target.
   * @param {DragEvent} event   The drag event.
   */
  #onDragOver(event) {}

  /* -------------------------------------------------- */

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event   The drag event.
   * @returns {Promise<void>}
   */
  async #onDrop(event) {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event);
    const item = this.document;
    const allowed = Hooks.call("dropItemSheetData", item, this, data);
    if (allowed === false) return;

    // Dropped Documents
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (documentClass) {
      const effect = await documentClass.fromDropData(data);
      if (!effect) return;
      if (effect.parent === item) {
        await this.#onSortEffects(event, effect);
      } else {
        const keepId = !item.effects.has(effect.id);
        await documentClass.create(effect.toObject(), { parent: item, keepId });
      }
    }
  }

  /* -------------------------------------------------- */

  /**
   * Sort effects.
   * @param {DragEvent} event                         The initiating drag event.
   * @param {foundry.documents.ActiveEffect} effect   The effect that was dropped.
   */
  async #onSortEffects(event, effect) {
    const effects = this.document.effects;
    const source = effects.get(effect.id);

    // Confirm the drop target
    const dropTarget = event.target.closest("[data-effect-id]");
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.effectId);
    if (source.id === target.id) return;

    // Identify sibling effects based on adjacent HTML elements
    const siblings = [];
    for (const element of dropTarget.parentElement.children) {
      const siblingId = element.dataset.effectId;
      if (siblingId && (siblingId !== source.id)) siblings.push(effects.get(element.dataset.effectId));
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(source, { target, siblings });
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    this.document.updateEmbeddedDocuments("ActiveEffect", updateData);
  }
}
