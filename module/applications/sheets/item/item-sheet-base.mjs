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
  /*   Context preparation                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.systemFields = this.document.system.schema.fields;
    context.isPlayMode = this.isPlayMode;
    context.isEditMode = this.isEditMode;

    return context;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    return this[`_preparePartContext${partId.capitalize()}`](context, options);
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
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Create a pseudo-document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
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
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #deletePseudoDocument(event, target) {
    const doc = this._getPseudoDocument(target);
    doc.delete();
  }

  /* -------------------------------------------------- */

  /**
   * Render the sheet of a pseudo-document.
   * @this {ItemSheetArtichron}
   * @param {PointerEvent} event      The originating click event.
   * @param {HTMLElement} target      The capturing HTML element which defined a [data-action].
   */
  static #renderPseudoDocumentSheet(event, target) {
    const doc = this._getPseudoDocument(target);
    doc.sheet.render({ force: true });
  }
}
