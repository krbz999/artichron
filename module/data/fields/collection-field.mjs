/**
 * A collection that houses pseudo-documents.
 */
export default class CollectionField extends foundry.data.fields.TypedObjectField {
  constructor(model, options = {}) {
    const field = new _CollectionField(model);
    super(field, options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options = {}) {
    const collection = new ModelCollection();
    for (const [k, v] of Object.entries(value)) {
      v._id = k;
      const init = this.element.initialize(v, model, options);
      collection.set(k, init);
    }
    return collection;
  }
}

/* -------------------------------------------------- */

/**
 * Field that stores data model data and swaps class based on subtype.
 */
class _CollectionField extends foundry.data.fields.ObjectField {
  constructor(model, options = {}, { name, parent } = {}) {
    super(options, { name, parent });
    this.#model = model;
  }

  /* -------------------------------------------------- */

  /**
   * The data model instance.
   * @type {typeof foundry.abstract.DataModel}
   */
  #model = null;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static recursive = true;

  /* -------------------------------------------------- */

  /**
   * Get the document type for this data model.
   * @param {object} value                Data being prepared.
   * @returns {typeof DataModel|null}     Data model subtype.
   */
  getModel(value) {
    if (this.#model.metadata?.typed === false) return this.#model;
    return this.#model.TYPES[value?.type] ?? null;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _cleanType(value, options) {
    if (!(typeof value === "object")) value = {};

    const cls = this.getModel(value);
    if (cls) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options = {}) {
    const cls = this.getModel(value);
    if (cls) return new cls(value, { parent: model, ...options });
    return foundry.utils.deepClone(value);
  }

  /* -------------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData  Candidate source data of the root model.
   * @param {any} fieldData      The value of this field within the source data.
   */
  migrateSource(sourceData, fieldData) {
    const cls = this.getModel(fieldData);
    if (cls) cls.migrateDataSafe(fieldData);
  }
}

/* -------------------------------------------------- */

/**
 * Specialized collection type for stored data models.
 * @param {Array<string, DataModel>} entries      Array containing the data models to store.
 */
class ModelCollection extends foundry.utils.Collection {
  /* -------------------------------------------------- */
  /*  Properties                                        */
  /* -------------------------------------------------- */

  /**
   * Pre-organized arrays of data models by type.
   * @type {Map<string, Set<string>>}
   */
  #types = new Map();

  /* -------------------------------------------------- */

  /**
   * The data models that originate from this parent document.
   * @type {PseudoDocument[]}
   */
  get sourceContents() {
    return this.filter(model => model.isSource);
  }

  /* -------------------------------------------------- */
  /*  Methods                                           */
  /* -------------------------------------------------- */

  /**
   * Fetch an array of data models of a certain type.
   * @param {string} type     Subtype.
   * @returns {DataModel[]}
   */
  getByType(type) {
    return Array.from(this.#types.get(type) ?? []).map(key => this.get(key));
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  set(key, value) {
    if (!this.#types.has(value.type)) this.#types.set(value.type, new Set());
    this.#types.get(value.type).add(key);
    return super.set(key, value);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  delete(key) {
    this.#types.get(this.get(key)?.type)?.delete(key);
    return super.delete(key);
  }

  /* -------------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param {function(*, number, ModelCollection): boolean} predicate     The predicate.
   * @returns {boolean}
   */
  every(predicate) {
    return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
  }

  /* -------------------------------------------------- */

  /**
   * Convert the ModelCollection to an array of simple objects.
   * @param {boolean} [source=true]     Draw data for contained Documents from the underlying data source?
   * @returns {object[]}                The extracted array of primitive objects.
   */
  toObject(source = true) {
    return this.map(doc => doc.toObject(source));
  }
}
