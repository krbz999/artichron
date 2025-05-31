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
      width: 500,
      height: "auto",
    },
    actions: {
      createPseudoDocument: ItemSheetArtichron.#createPseudoDocument,
      deletePseudoDocument: ItemSheetArtichron.#deletePseudoDocument,
      renderPseudoDocumentSheet: ItemSheetArtichron.#renderPseudoDocumentSheet,
      createEmbeddedDocument: ItemSheetArtichron.#createEmbeddedDocument,
      renderEmbeddedDocumentSheet: ItemSheetArtichron.#renderEmbeddedDocumentSheet,
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
        { id: "description", tooltip: "ARTICHRON.SHEET.TABS.description", icon: "fa-solid fa-fw fa-pen-fancy" },
        { id: "details", tooltip: "ARTICHRON.SHEET.TABS.details", icon: "fa-solid fa-fw fa-tags" },
        { id: "fusion", tooltip: "ARTICHRON.SHEET.TABS.fusion", icon: "fa-solid fa-fw fa-volcano" },
        { id: "activities", tooltip: "ARTICHRON.SHEET.TABS.activities", icon: "fa-solid fa-fw fa-location-crosshairs " },
        { id: "advancements", tooltip: "ARTICHRON.SHEET.TABS.advancements", icon: "fa-solid fa-fw fa-circle-nodes" },
        { id: "effects", tooltip: "ARTICHRON.SHEET.TABS.effects", icon: "fa-solid fa-fw fa-bolt" },
      ],
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
      ".document-list.effects button[data-id]",
      { hookName: "ActiveEffectEntryContext" },
    );

    // Add context menu for activities.
    this._createContextMenu(
      this.#getContextOptionsActivity,
      ".document-list[data-pseudo-document-name=Activity] button[data-pseudo-id]",
      { hookName: "ActivityEntryContext" },
    );

    // Add context menu for advancements.
    this._createContextMenu(
      this.#getContextOptionsAdvancement,
      ".document-list[data-pseudo-document-name=Advancement] button[data-pseudo-id]",
      { hookName: "AdvancementEntryContext" },
    );

    // Add context menu for armor requirements.
    this._createContextMenu(
      this.#getContextOptionsArmorRequirement,
      ".document-list[data-pseudo-document-name=ArmorRequirement] button[data-pseudo-id]",
      { hookName: "ArmorRequirementEntryContext" },
    );
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
      condition: btn => !getEffect(btn).isActiveFusion,
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
      condition: btn => !getEffect(btn).isActiveFusion,
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
      condition: btn => getEffect(btn).isActiveFusion,
      callback: btn => getEffect(btn).unfuseDialog(),
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

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.config = artichron.config;
    context.systemFields = this.document.system.schema.fields;
    context.isPlayMode = this.isPlayMode;
    context.isEditMode = this.isEditMode;

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const fn = `_preparePartContext${partId.capitalize()}`;
    if (!(this[fn] instanceof Function)) {
      throw new Error(`The ${this.constructor.name} sheet does not implement the ${fn} method.`);
    }

    return this[fn](context, options);
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
  async _preparePartContextHeader(context, options) {
    context.ctx = {
      name: context.isPlayMode ? this.document.name : this.document._source.name,
      img: context.isPlayMode ? this.document.img : this.document._source.img,
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
  async _preparePartContextTabs(context, options) {
    context.verticalTabs = true;
    for (const k in context.tabs)
      if (this.constructor.metadata.excludeTabs.includes(k))
        delete context.tabs[k];
    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare a part.
   * @param {object} context    Rendering context. **will be mutated**
   * @param {object} options    Rendering options.
   * @returns {Promise<object>}   Rendering context.
   */
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
  /*   Utility methods                                  */
  /* -------------------------------------------------- */

  /**
   * Get a pseudo-document.
   * @param {HTMLElement} element   The element with relevant data.
   * @returns {artichron.data.pseudoDocuments.PseudoDocument}
   */
  _getPseudoDocument(element) {
    const documentName = element.closest("[data-pseudo-document-name]").dataset.pseudoDocumentName;
    const id = element.closest("[data-pseudo-id]").dataset.pseudoId;
    return this.document.getEmbeddedDocument(documentName, id);
  }

  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Create a pseudo-document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #createPseudoDocument(event, target) {
    const documentName = target.closest("[data-pseudo-document-name]").dataset.pseudoDocumentName;
    const type = target.closest("[data-pseudo-type]")?.dataset.pseudoType;
    const Cls = this.document.getEmbeddedPseudoDocumentCollection(documentName).documentClass;

    if (!type && (foundry.utils.isSubclass(Cls, artichron.data.pseudoDocuments.TypedPseudoDocument))) {
      Cls.createDialog({}, { parent: this.document });
    } else {
      Cls.create({ type }, { parent: this.document });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Delete a pseudo-document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #deletePseudoDocument(event, target) {
    const doc = this._getPseudoDocument(target);
    doc.delete();
  }

  /* -------------------------------------------------- */

  /**
   * Render the sheet of a pseudo-document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #renderPseudoDocumentSheet(event, target) {
    const doc = this._getPseudoDocument(target);
    doc.sheet.render({ force: true });
  }

  /* -------------------------------------------------- */

  /**
   * Create a new embedded document on this document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #createEmbeddedDocument(event, target) {
    const documentName = target.closest("[data-document-name]").dataset.documentName;
    const type = target.closest("[data-type]")?.dataset.type;
    const Cls = foundry.utils.getDocumentClass(documentName);
    if (type) {
      Cls.create({
        type,
        name: Cls.defaultName({ type, parent: this.document }),
      }, { parent: this.document });
    } else {
      Cls.createDialog({}, { parent: this.document });
    }
  }

  /* -------------------------------------------------- */

  /**
   * Render the sheet of an embedded document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The capturing HTML element which defined a [data-action].
   */
  static #renderEmbeddedDocumentSheet(event, target) {
    const documentName = target.closest("[data-document-name]").dataset.documentName;
    const id = target.closest("[data-id]").dataset.id;
    this.document.getEmbeddedDocument(documentName, id).sheet.render({ force: true });
  }
}
