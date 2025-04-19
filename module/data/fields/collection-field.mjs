const { EmbeddedDataField, TypedObjectField, TypedSchemaField } = foundry.data.fields;

/**
 * A collection that houses pseudo-documents.
 */
export default class CollectionField extends TypedObjectField {
  constructor(model, { typed = true, ...options } = {}, context = {}) {
    let field;
    if (typed === false) field = new EmbeddedDataField(model);
    else field = new TypedSchemaField(model.TYPES);
    options.validateKey ||= ((key) => foundry.data.validators.isValidId(key));
    super(field, options, context);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options = {}) {
    const init = super.initialize(value, model, options);
    const collection = new ModelCollection();
    for (const [id, model] of Object.entries(init)) {
      collection.set(id, model);
    }
    return collection;
  }
}

/* -------------------------------------------------- */

/**
 * Specialized collection type for stored data models.
 * @param {Array<string, DataModel>} entries    Array containing the data models to store.
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
