import ArtichronApplicationMixin from "./artichron-application-mixin.mjs";

const { Application } = foundry.applications.api;

/**
 * Base sheet class for pseudo-documents.
 * @extends {ArtichronApplicationMixin}
 * @extends {foundry.applications.api.Application}
 */
export default class PseudoDocumentSheet extends ArtichronApplicationMixin(Application) {
  constructor(options) {
    super(options);
    this.#pseudoUuid = options.document.uuid;
    this.#document = options.document.document;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "{id}",
    actions: {
      copyUuid: {
        handler: PseudoDocumentSheet.#copyUuid,
        buttons: [0, 2],
      },
    },
    form: {
      handler: PseudoDocumentSheet.#onSubmitForm,
      submitOnChange: true,
    },
    position: {
      width: 500,
      height: "auto",
    },
    tag: "form",
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
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

  /**
   * Registered sheets.
   * @type {Map<foundry.abstract.Document, Map<string, PseudoDocumentSheet>>}
   */
  static #sheets = new Map();

  /* -------------------------------------------------- */

  /**
   * Stored uuid of this pseudo document.
   * @type {string}
   */
  #pseudoUuid;

  /* -------------------------------------------------- */

  /**
   * The pseudo-document. This can be null if a parent pseudo-document is removed.
   * @type {PseudoDocument|null}
   */
  get pseudoDocument() {
    let relative = this.document;
    const uuidParts = this.#pseudoUuid.replace(relative.uuid, "").slice(1).split(".");
    for (let i = 0; i < uuidParts.length; i += 2) {
      const dname = uuidParts[i];
      const id = uuidParts[i + 1];
      relative = relative?.getEmbeddedDocument(dname, id);
      if (!relative) return null;
    }
    return relative;
  }

  /* -------------------------------------------------- */

  /**
   * The parent document.
   * @type {Document}
   */
  #document;

  /* -------------------------------------------------- */

  /**
   * The parent document.
   * @type {Document}
   */
  get document() {
    return this.#document;
  }

  /* -------------------------------------------------- */

  /**
   * Is this pseudo-document sheet editable by the current User?
   * Whether this sheet is editable is governed by the parent document's sheet.
   * @type {boolean}
   */
  get isEditable() {
    return this.document.sheet.isEditable;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const pseudo = this.pseudoDocument;
    const { documentName, name } = pseudo;
    const label = pseudo.constructor.metadata.label;
    return [
      game.i18n.localize(`DOCUMENT.${documentName}`),
      name ? name : (label ? game.i18n.localize(label) : null),
    ].filterJoin(": ");
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve or register a sheet for a pseudo-document.
   * @param {artichron.data.pseudoDocuments.PseudoDocument} pseudoDocument
   * @returns {PseudoDocumentSheet|null}    An existing or new instance of a sheet, or null if the pseudo-
   *                                        document does not have a sheet class.
   */
  static getSheet(pseudoDocument) {
    const doc = pseudoDocument.document;
    if (!PseudoDocumentSheet.#sheets.get(doc)) {
      PseudoDocumentSheet.#sheets.set(doc, new Map());
    }
    if (!PseudoDocumentSheet.#sheets.get(doc).get(pseudoDocument.uuid)) {
      const Cls = pseudoDocument.constructor.metadata.sheetClass;
      if (!Cls) return null;
      PseudoDocumentSheet.#sheets.get(doc).set(pseudoDocument.uuid, new Cls({ document: pseudoDocument }));
    }
    return PseudoDocumentSheet.#sheets.get(doc).get(pseudoDocument.uuid);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions({ document, ...options }) {
    options = super._initializeApplicationOptions(options);
    options.uniqueId = `${this.constructor.name}-${document.uuid.replaceAll(".", "-")}`;
    return options;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.document.apps[this.id] = this;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _onClose(options) {
    super._onClose(options);
    delete this.document.apps[this.id];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const doc = this.pseudoDocument;

    Object.assign(context, {
      pseudoDocument: doc,
      source: doc._source,
      document: this.document,
      fields: doc.schema.fields,
      editable: this.isEditable,
    });

    return context;
  }

  /* -------------------------------------------------- */

  /**
   * Utility context preparation method for individual fields.
   * @param {string} path   The path to the given field, relative to the root of the pseudo document.
   * @returns {object}      Field context.
   */
  _prepareField(path) {
    const doc = this.pseudoDocument;
    const field = doc.schema.getField(path);
    const value = foundry.utils.getProperty(doc, path);
    const src = foundry.utils.getProperty(doc._source, path);
    return { field, value, src, name: path };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const copyLabel = game.i18n.localize("SHEETS.CopyUuid");

    const properties = Object.entries({
      type: "button",
      class: "header-control fa-solid fa-passport icon",
      "data-action": "copyUuid",
      "data-tooltip": copyLabel,
      "aria-label": copyLabel,
    }).map(([k, v]) => `${k}="${v}"`).join(" ");
    const copyId = `<button ${properties}></button>`;
    this.window.close.insertAdjacentHTML("beforebegin", copyId);
    return frame;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _canRender(options) {
    if (!this.pseudoDocument) {
      if (this.rendered) this.close();
      return false;
    }
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {PseudoDocumentSheet}
   * @param {PointerEvent} event          The initiating click event.
   * @param {HTMLElement} form            The form element.
   * @param {FormDataExtended} formData   The form data.
   */
  static async #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    this.pseudoDocument.update(submitData);
  }

  /* -------------------------------------------------- */

  /**
   * @this {PseudoDocumentSheet}
   * @param {PointerEvent} event    The initiating click event.
   */
  static #copyUuid(event) {
    event.preventDefault(); // Don't open context menu
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    const pseudo = this.pseudoDocument;
    const id = event.button === 2 ? pseudo.id : pseudo.uuid;
    const type = event.button === 2 ? "id" : "uuid";
    const label = game.i18n.localize(`DOCUMENT.${pseudo.documentName}`);
    game.clipboard.copyPlainText(id);
    ui.notifications.info("DOCUMENT.IdCopiedClipboard", { format: { label, type, id } });
  }
}
