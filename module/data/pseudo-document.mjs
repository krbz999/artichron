const { DocumentIdField, StringField } = foundry.data.fields;

export default class PseudoDocument extends foundry.abstract.DataModel {
  /**
   * Pseudo-document metadata.
   * @type {PseudoDocumentMetadata}
   */
  static get metadata() {
    return {
      documentName: "",
    };
  }

  /* -------------------------------------------------- */

  /**
   * Registered sheets.
   * @type {Map<string, PseudoDocumentSheet>}
   */
  static _sheets = new Map();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        initial: () => this.TYPE,
        required: true,
        blank: false,
        readonly: true,
        validate: value => value === this.TYPE,
        validationError: `Type can only be '${this.type}'.`,
      }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The type of this pseudo-document subclass.
   * @type {string}
   * @abstract
   */
  static get TYPE() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * The subtypes of this pseudo-document.
   * @type {Record<string, typeof PseudoDocument>}
   * @abstract
   */
  static get TYPES() {
    throw new Error("The 'TYPES' getter must be overridden in a subclass.");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [];

  /* -------------------------------------------------- */

  /**
   * The id of this pseudo-document.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The uuid of this document.
   * @type {string}
   */
  get uuid() {
    return [this.document.uuid, this.constructor.metadata.documentName, this.id].join(".");
  }

  /* -------------------------------------------------- */

  /**
   * The parent document of this pseudo-document.
   * @type {Document}
   */
  get document() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Reference to the sheet of this pseudo-document, registered in a static map.
   * @type {PseudoDocumentSheet|null}
   */
  get sheet() {
    if (!PseudoDocument._sheets.has(this.uuid)) {
      const Cls = this.constructor.metadata.sheetClass;
      if (!Cls) return null;
      PseudoDocument._sheets.set(this.uuid, new Cls({ document: this }));
    }
    return PseudoDocument._sheets.get(this.uuid);
  }

  /* -------------------------------------------------- */
  /*   Data preparation                                 */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  _initialize(...args) {
    super._initialize(...args);
    this.prepareData();
  }

  /**
   * Prepare data.
   */
  prepareData() {
    this.prepareBaseData();
    this.prepareDerivedData();
  }

  /* -------------------------------------------------- */

  /**
   * Prepase base data.
   */
  prepareBaseData() {}

  /* -------------------------------------------------- */

  /**
   * Prepare derived data.
   */
  prepareDerivedData() {}

  /* -------------------------------------------------- */
  /*   CRUD Handlers                                    */
  /* -------------------------------------------------- */

  /**
   * The path to this pseudo-document relative to the parent document.
   * @type {string}
   */
  static get _path() {
    return "";
  }

  /* -------------------------------------------------- */

  /**
   * Does this pseudo-document exist in the document's source?
   * @type {boolean}
   */
  get #isSource() {
    const path = this.constructor._path.slice(7);
    const source = foundry.utils.getProperty(this.document.system._source, path);
    if (foundry.utils.getType(source) !== "Object") {
      throw new Error("Source is not an object!");
    }
    return this.id in source;
  }
  get isSource() {
    return this.#isSource;
  }

  /* -------------------------------------------------- */

  /**
   * Create a new instance of this pseudo-document.
   * @param {object} [data]                 The data used for the creation.
   * @param {object} operation              The context of the operation.
   * @param {Document} operation.parent     The parent of this document.
   * @returns {Promise<Document>}           A promise that resolves to the updated document.
   */
  static async create(data = {}, { parent, ...operation } = {}) {
    if (!parent) {
      throw new Error("A parent document must be specified for the creation of a pseudo-document!");
    }
    const id = operation.keepId && foundry.data.validators.isValidId(data._id) ? data._id : foundry.utils.randomID();
    const path = `${this._path}.${id}`;
    const type = data.type || Object.keys(this.TYPES)[0];

    const update = { [path]: { ...data, _id: id, type } };

    this._configureUpdates("create", parent, update, operation);

    return parent.update(update, operation);
  }

  /* -------------------------------------------------- */

  /**
   * @param {string} action       The operation.
   * @param {Document} document   The parent document.
   * @param {object} update       The data used for the update.
   * @param {object} operation    The context of the operation.
   */
  static _configureUpdates(action, document, update, operation) {}

  /* -------------------------------------------------- */

  /**
   * Delete this pseudo-document.
   * @param {object} [operation]      The context of the operation.
   * @returns {Promise<Document>}     A promise that resolves to the updated document.
   */
  async delete(operation = {}) {
    if (!this.#isSource) throw new Error("You cannot delete a non-source pseudo-document!");
    const path = `${this.constructor._path}.-=${this.id}`;
    Object.assign(operation, { pseudo: { operation: "delete", type: this.constructor.documentName, uuid: this.uuid } });
    return this.document.update({ [path]: null }, operation);
  }

  /* -------------------------------------------------- */

  /**
   * Duplicate this pseudo-document.
   * @returns {Promise<Document>}     A promise that resolves to the updated document.
   */
  async duplicate() {
    if (!this.isSource) throw new Error("You cannot duplicate a non-source pseudo-document!");
    const activityData = foundry.utils.mergeObject(this.toObject(), {
      name: game.i18n.format("DOCUMENT.CopyOf", { name: this.name }),
    });
    return this.constructor.create(activityData, { parent: this.document });
  }

  /* -------------------------------------------------- */

  /**
   * Update this pseudo-document.
   * @param {object} [change]         The change to perform.
   * @param {object} [operation]      The context of the operation.
   * @returns {Promise<Document>}     A promise that resolves to the updated document.
   */
  async update(change = {}, operation = {}) {
    if (!this.#isSource) throw new Error("You cannot update a non-source pseudo-document!");
    const path = `${this.constructor._path}.${this.id}`;
    return this.document.update({ [path]: change }, operation);
  }
}
