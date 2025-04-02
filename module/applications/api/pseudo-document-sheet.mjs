const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

export default class PseudoDocumentSheet extends HandlebarsApplicationMixin(Application) {
  constructor(options) {
    super(options);
    this.#pseudoId = options.document.id;
    this.#parent = options.document.document;
    this.#pseudoDocumentClass = options.document.constructor;
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
   * The id of the pseudo-document.
   * @type {string}
   */
  #pseudoId;

  /* -------------------------------------------------- */

  /**
   * The pseudo-document.
   * @type {PseudoDocument}
   */
  get pseudoDocument() {
    return foundry.utils.getProperty(this.document, this.#pseudoDocumentClass.metadata.path).get(this.#pseudoId);
  }

  /* -------------------------------------------------- */

  /**
   * The constructor class of the pseudo-document.
   * @type {typeof PseudoDocument}
   */
  #pseudoDocumentClass;

  /* -------------------------------------------------- */

  /**
   * The parent document.
   * @type {Document}
   */
  #parent;

  /* -------------------------------------------------- */

  /**
   * The parent document.
   * @type {Document}
   */
  get document() {
    return this.#parent;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get title() {
    const { documentName, defaultName } = this.#pseudoDocumentClass.metadata;
    return [
      game.i18n.localize(`DOCUMENT.${documentName}`),
      this.pseudoDocument.name || game.i18n.localize(defaultName),
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
    const label = game.i18n.localize(`DOCUMENT.${this.#pseudoDocumentClass.metadata.documentName}`);
    game.clipboard.copyPlainText(id);
    ui.notifications.info("DOCUMENT.IdCopiedClipboard", { format: { label, type, id } });
  }
}
