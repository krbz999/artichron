const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class PseudoDocumentSheet extends HandlebarsApplicationMixin(Application) {
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
    classes: ["artichron"],
    document: null,
    form: {
      handler: PseudoDocumentSheet.#onSubmitForm,
      submitOnChange: true,
    },
    position: {
      width: 500,
      height: "auto",
    },
    tag: "form",
    window: {
      contentClasses: ["standard-form"],
    },
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

  /** @inheritdoc */
  tabGroups = {};

  /* -------------------------------------------------- */

  /**
   * Stored uuid of this pseudo document.
   * @type {string}
   */
  #pseudoUuid;

  /* -------------------------------------------------- */

  /**
   * The pseudo-document.
   * @type {PseudoDocument}
   */
  get pseudoDocument() {
    return fromUuidSync(this.#pseudoUuid);
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

  /** @inheritdoc */
  get title() {
    const pseudo = this.pseudoDocument;
    const { documentName, name } = pseudo;
    const defaultName = pseudo.constructor.metadata.defaultName;
    return [
      game.i18n.localize(`DOCUMENT.${documentName}`),
      name || game.i18n.localize(defaultName),
    ].join(": ");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    const suffix = options.document.uuid;
    options.uniqueId = `${this.constructor.name}-${suffix.replaceAll(".", "-")}`;
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
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle form submission.
   * @this {PseudoDocumentSheet}
   * @param {PointerEvent} event            The originating click event.
   * @param {HTMLElement} form              The form element.
   * @param {FormDataExtended} formData     The form data.
   */
  static #onSubmitForm(event, form, formData) {
    const submitData = foundry.utils.expandObject(formData.object);
    this.pseudoDocument.update(submitData);
  }

  /* -------------------------------------------------- */

  /**
   * @this {PseudoDocumentSheet}
   * @param {PointerEvent} event      The originating click event.
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
