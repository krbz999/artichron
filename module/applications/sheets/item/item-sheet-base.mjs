import PseudoDocument from "../../../data/pseudo-documents/pseudo-document.mjs";
import ArtichronSheetMixin from "../../api/document-sheet-mixin.mjs";

/**
 * @mixes foundry.applications.api.HandlebarsApplicationMixin
 * @extends {foundry.applications.sheets.ItemSheet}
 */
export default class ItemSheetArtichron extends ArtichronSheetMixin(foundry.applications.sheets.ItemSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ["item"],
    position: {
      width: 350,
      height: "auto",
    },
  };

  /* -------------------------------------------------- */

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
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static TABS = {
    primary: {
      tabs: [
        { id: "description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "details", icon: "fa-solid fa-fw fa-tags" },
        { id: "fusion", icon: "fa-solid fa-fw fa-volcano" },
        { id: "activities", icon: "fa-solid fa-fw fa-location-crosshairs " },
        { id: "advancements", icon: "fa-solid fa-fw fa-circle-nodes" },
        { id: "effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
      labelPrefix: "ARTICHRON.SHEET.TABS",
      initial: "description",
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _sheetMode = this.document.isEmbedded ? this.constructor.SHEET_MODES.PLAY : this.constructor.SHEET_MODES.EDIT;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    // Add context menu for effects.
    this._createContextMenu(
      this.#getContextOptionsActiveEffect,
      ".document-list.effects .entry",
      { hookName: "ActiveEffectEntryContext" },
    );

    // Add context menu for activities.
    this._createContextMenu(
      this.#getContextOptionsActivity,
      ".document-list.activities .entry",
      { hookName: "ActivityEntryContext" },
    );

    // Add context menu for advancements.
    this._createContextMenu(
      this.#getContextOptionsAdvancement,
      ".document-list.advancements .entry",
      { hookName: "AdvancementEntryContext" },
    );

    // Add context menu for armor requirements.
    this._createContextMenu(
      this.#getContextOptionsArmorRequirement,
      ".document-list.armor-requirements .entry",
      { hookName: "ArmorRequirementEntryContext" },
    );
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    new foundry.applications.ux.DragDrop.implementation({
      dragSelector: ".draggable",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      },
    }).bind(this.element);
  }

  /* -------------------------------------------------- */
  /*   Context menu                                     */
  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for ActiveEffects.
   * @returns {object[]}
   */
  #getContextOptionsActiveEffect() {
    if (!this.document.isOwner) return [];
    const getEffect = btn => this.document.effects.get(btn.dataset.id);

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      callback: btn => getEffect(btn).sheet.render({ force: true }),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: btn => getEffect(btn).type !== "fusion",
      callback: btn => getEffect(btn).deleteDialog(),
      group: "manage",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.enable",
      icon: "<i class='fa-solid fa-fw fa-toggle-on'></i>",
      condition: btn => getEffect(btn).disabled,
      callback: btn => getEffect(btn).update({ disabled: false }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.disable",
      icon: "<i class='fa-solid fa-fw fa-toggle-off'></i>",
      condition: btn => !getEffect(btn).disabled && (getEffect(btn).type !== "fusion"),
      callback: btn => getEffect(btn).update({ disabled: true }),
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: btn => getEffect(btn).type !== "fusion",
      callback: btn => {
        const effect = getEffect(btn);
        effect.clone(
          { name: game.i18n.format("DOCUMENT.CopyOf", { name: effect._source.name }) },
          { save: true, addSource: true },
        );
      },
      group: "action",
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.EFFECT.unfuse",
      icon: "<i class='fa-solid fa-fw fa-volcano'></i>",
      condition: btn => getEffect(btn).type === "fusion",
      callback: btn => getEffect(btn).system.unfuseDialog(),
      group: "action",
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for activities.
   * @returns {object[]}
   */
  #getContextOptionsActivity() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ACTIVITY.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for advancements.
   * @returns {object[]}
   */
  #getContextOptionsAdvancement() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.ADVANCEMENT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */

  /**
   * Prepare options for context menus for armor requirements.
   * @returns {object[]}
   */
  #getContextOptionsArmorRequirement() {
    if (!this.document.isOwner) return [];

    return [{
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.render",
      icon: "<i class='fa-solid fa-fw fa-edit'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).sheet.render({ force: true }),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.delete",
      icon: "<i class='fa-solid fa-fw fa-trash'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).delete(),
    }, {
      name: "ARTICHRON.SHEET.ITEM.CONTEXT.REQUIREMENT.duplicate",
      icon: "<i class='fa-solid fa-fw fa-copy'></i>",
      condition: element => this._getPseudoDocument(element).isSource,
      callback: element => this._getPseudoDocument(element).duplicate(),
    }];
  }

  /* -------------------------------------------------- */
  /*   Context preparation                              */
  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextHeader(context, options) {
    return context;
  }

  /* -------------------------------------------------- */

  /** @type {import("../../../_types").ContextPartHandler} */
  async _preparePartContextDescription(context, options) {
    context.ctx = {
      descriptionValue: await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.description.value,
        { relativeTo: this.document, rollData: context.rollData },
      ),
    };
    return context;
  }

  /* -------------------------------------------------- */
  /*   Drag and Drop                                    */
  /* -------------------------------------------------- */

  /**
   * Define whether a user is able to begin a dragstart workflow for a given drag selector.
   * @param {string} selector   The candidate HTML selector for dragging.
   * @returns {boolean}         Can the current user drag this selector?
   */
  _canDragStart(selector) {
    return true;
  }

  /* -------------------------------------------- */

  /**
   * Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector.
   * @param {string} selector   The candidate HTML selector for the drop target.
   * @returns {boolean}         Can the current user drop on this selector?
   */
  _canDragDrop(selector) {
    return this.isEditable;
  }

  /* -------------------------------------------- */

  /**
   * An event that occurs when a drag workflow begins for a draggable item on the sheet.
   * @param {DragEvent} event   The initiating drag start event.
   * @returns {Promise<void>}
   */
  async _onDragStart(event) {
    if ("link" in event.target.dataset) return;
    const target = event.currentTarget;
    const isPseudo = !!target.closest("[data-pseudo-id]");
    const document = isPseudo ? this._getPseudoDocument(target) : this._getEmbeddedDocument(target);
    if (!document) return;
    event.dataTransfer.setData("text/plain", JSON.stringify(document.toDragData()));
  }

  /* -------------------------------------------- */

  /**
   * An event that occurs when a drag workflow moves over a drop target.
   * @param {DragEvent} event
   */
  _onDragOver(event) {}

  /* -------------------------------------------- */

  /**
   * An event that occurs when data is dropped into a drop target.
   * @param {DragEvent} event
   * @returns {Promise<void>}
   */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const allowed = Hooks.call("dropItemSheetData", this.document, this, data);
    if (allowed === false) return;

    // Dropped documents.
    const documentClass = foundry.utils.getDocumentClass(data.type);
    if (documentClass) {
      const document = await documentClass.fromDropData(data);
      await this._onDropDocument(event, document);
    }

    // Dropped pseudo-documents.
    else {
      const document = await fromUuid(data.uuid);
      if (document instanceof PseudoDocument) await this._onDropPseudoDocument(event, document);
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle a dropped document on the item sheet.
   * @template {Document|PseudoDocument} TDocument
   * @param {DragEvent} event             The initiating drop event.
   * @param {TDocument} document          The resolved Document class.
   * @returns {Promise<TDocument|null>}   A Document of the same type as the dropped one in case of a successful
   *                                      result, or null in case of failure or no action being taken.
   */
  async _onDropDocument(event, document) {
    switch (document.documentName) {
      case "ActiveEffect": return (await this._onDropActiveEffect(event, document)) ?? null;
      default: return null;
    }
  }

  /* -------------------------------------------- */

  /**
   * Handle a dropped Active Effect on the sheet.
   * The default implementation creates an Active Effect embedded document on this sheet's document.
   * @param {DragEvent} event                           The initiating drop event.
   * @param {ActiveEffect} effect                       The dropped ActiveEffect document.
   * @returns {Promise<ActiveEffect|null|undefined>}    A promise resolving to a newly created ActiveEffect, if one was
   *                                                    created, or otherwise a nullish value.
   */
  async _onDropActiveEffect(event, effect) {
    if (!this.isEditable) return;

    if (effect.parent === this.document) return this._onSortEffects(event, effect);

    const keepId = !this.document.effects.has(effect.id);
    const result = await effect.constructor.create(effect.toObject(), { parent: this.document, keepId });
    return result ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Handle a dropped pseudo-document on the sheet.
   * @param {DragEvent} event                                     The initiating drop event.
   * @param {PseudoDocument} document                             The dropped pseudo-document.
   * @returns {Promise<foundry.documents.Item|null|undefined>}    A promise that resolves to the updated item, if a
   *                                                              pseudo-document was created, otherwise a nullish value.
   */
  async _onDropPseudoDocument(event, document) {
    if (!this.isEditable) return;
    const collection = this.document.getEmbeddedPseudoDocumentCollection(document.documentName);
    if (!collection) return null;

    // Pseudo-document already belonged to this.
    if (document.document === this.document) return null;

    const keepId = !collection.has(document.id);
    const result = await document.constructor.create(document.toObject(), {
      parent: this.document, keepId, renderSheet: false,
    });
    return result ?? null;
  }

  /* -------------------------------------------------- */

  /**
   * Sort effects.
   * @param {DragEvent} event                         The initiating drag event.
   * @param {foundry.documents.ActiveEffect} effect   The effect that was dropped.
   * @returns {Promise<foundry.documents.ActiveEffect[]|null|undefined}>
   */
  async _onSortEffects(event, effect) {
    const effects = this.document.effects;
    const source = effects.get(effect.id);

    const parent = event.target.closest("[data-document-name=ActiveEffect]");
    if (!parent) return;

    // Confirm the drop target
    const dropTarget = event.target.closest("[data-id]");
    if (!dropTarget) return;
    const target = effects.get(dropTarget.dataset.id);
    if (source.id === target.id) return;

    // Identify sibling effects based on adjacent HTML elements
    const siblings = [];
    for (const element of parent.querySelectorAll("[data-id]")) {
      const siblingId = element.dataset.id;
      if (siblingId && (siblingId !== source.id)) siblings.push(effects.get(element.dataset.id));
    }

    // Perform the sort
    const sortUpdates = foundry.utils.performIntegerSort(source, { target, siblings });
    const updateData = sortUpdates.map(u => {
      const update = u.update;
      update._id = u.target._id;
      return update;
    });

    // Perform the update
    return this.document.updateEmbeddedDocuments("ActiveEffect", updateData);
  }
}
