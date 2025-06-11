import ArtichronApplicationMixin from "./artichron-application-mixin.mjs";

const { DocumentSheet } = foundry.applications.api;

export default class DocumentConfig extends ArtichronApplicationMixin(DocumentSheet) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    actions: {
      createPseudoDocument: DocumentConfig.#createPseudoDocument,
      deletePseudoDocument: DocumentConfig.#deletePseudoDocument,
      renderPseudoDocumentSheet: DocumentConfig.#renderPseudoDocumentSheet,
    },
    classes: ["config"],
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    position: {
      width: 400,
      height: "auto",
    },
    sheetConfig: false,
    window: {
      title: null,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    return `${game.i18n.localize(this.options.window.title)}: ${this.document.name}`;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      document: this.document,
      source: this.document._source,
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };
  }

  /* -------------------------------------------------- */
  /*   Everything below this is copied from document-   */
  /*   sheet-mixin.
  /* -------------------------------------------------- */

  /**
   * Helper method to retrieve an embedded pseudo-document.
   * @param {HTMLElement} element   The element with relevant data.
   * @returns {artichron.data.pseudoDocuments.PseudoDocument}
   */
  _getPseudoDocument(element) {
    const documentName = element.closest("[data-pseudo-document-name]").dataset.pseudoDocumentName;
    const id = element.closest("[data-pseudo-id]").dataset.pseudoId;
    return this.document.getEmbeddedDocument(documentName, id);
  }

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
}
