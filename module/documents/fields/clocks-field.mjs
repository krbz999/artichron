import MappingField from "./mapping-field.mjs";

const {ColorField, NumberField, StringField} = foundry.data.fields;

export default class ClocksField extends MappingField {
  constructor(options) {
    super(new ClockField(), options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options) {
    return new ClockCollection(model, super.initialize(value, model, options));
  }

  /* -------------------------------------------------- */

  /**
   * The types of clocks.
   * @type {object}
   */
  static get TYPES() {
    return Object.values({BadClock, GoodClock}).reduce((acc, cls) => {
      acc[cls.metadata.type] = cls;
      return acc;
    }, {});
  }
}

/* -------------------------------------------------- */

/**
 * Field that stores clock data and swaps class based on clock type.
 */
class ClockField extends foundry.data.fields.ObjectField {
  /** @override */
  static recursive = true;

  /* -------------------------------------------------- */

  /**
   * Get the document type for this clock.
   * @param {object} value            Clock data being prepared.
   * @returns {typeof Clock|null}     Clock document type.
   */
  getModel(value) {
    return Object.values(ClocksField.TYPES).find(a => a.metadata.type === value.type) ?? null;
  }

  /* -------------------------------------------------- */

  /** @override */
  _cleanType(value, options) {
    if (!(typeof value === "object")) value = {};

    const cls = this.getModel(value);
    if (cls) return cls.cleanData(value, options);
    return value;
  }

  /* -------------------------------------------------- */

  /** @override */
  initialize(value, model, options = {}) {
    const cls = this.getModel(value);
    if (cls) return new cls(value, {parent: model, ...options});
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
 * Specialized collection type for stored clocks.
 * @param {DataModel} model                   The parent DataModel to which this ClockCollection belongs.
 * @param {Record<string, Clock>} entries     Object containing the clocks to store.
 */
class ClockCollection extends foundry.utils.Collection {
  constructor(model, entries) {
    super();
    this.#model = model;
    for (const [id, entry] of Object.entries(entries)) {
      if (!(entry instanceof Clock)) continue;
      this.set(id, entry);
    }
  }

  /* -------------------------------------------------- */
  /*  Properties                                        */
  /* -------------------------------------------------- */

  /**
   * The parent DataModel to which this ClockCollection belongs.
   * @type {DataModel}
   */
  #model;

  /* -------------------------------------------------- */

  /**
   * Pre-organized arrays of clocks by type.
   * @type {Map<string, Set<string>>}
   */
  #types = new Map();

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {ActorArtichron}
   */
  get actor() {
    return this.#model.parent;
  }

  /* -------------------------------------------------- */
  /*  Methods                                           */
  /* -------------------------------------------------- */

  /**
   * Fetch an array of clocks of a certain type.
   * @param {string} type     Clock type.
   * @returns {Clock[]}       The clocks of the given type.
   */
  getByType(type) {
    return Array.from(this.#types.get(type) ?? []).map(key => this.get(key));
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  set(key, value) {
    if (!this.#types.has(value.type)) this.#types.set(value.type, new Set());
    this.#types.get(value.type).add(key);
    return super.set(key, value);
  }

  /* -------------------------------------------------- */

  /** @inheritDoc */
  delete(key) {
    this.#types.get(this.get(key)?.type)?.delete(key);
    return super.delete(key);
  }

  /* -------------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param {function(*, number, ClockCollection): boolean} predicate     The predicate.
   * @returns {boolean}
   */
  every(predicate) {
    return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
  }

  /* -------------------------------------------------- */

  /**
   * Convert the ClockCollection to an array of simple objects.
   * @param {boolean} [source=true]  Draw data for contained Documents from the underlying data source?
   * @returns {object[]}             The extracted array of primitive objects.
   */
  toObject(source = true) {
    return this.map(doc => doc.toObject(source));
  }

  /* -------------------------------------------------- */

  /**
   * Create a new clock.
   * @param {object} [data]     Clock data.
   * @returns {Promise}
   */
  async createClock(data = {}) {
    const id = foundry.utils.randomID();
    const path = `system.clocks.${id}`;
    return this.actor.update({[path]: {...data, _id: id}});
  }

  /* -------------------------------------------------- */

  /**
   * Delete a clock.
   * @param {string} id     The id of the clock to delete.
   * @returns {Promise}
   */
  async deleteClock(id) {
    const path = `system.clocks.-=${id}`;
    return this.actor.update(({[path]: null}));
  }
}

/* -------------------------------------------------- */

/**
 * Base clock data model.
 */
class Clock extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      _id: new StringField({
        required: true,
        blank: false,
        readonly: true,
        initial: () => foundry.utils.randomID()
      }),
      type: new StringField({
        initial: () => this.metadata.type,
        required: true,
        blank: false,
        readonly: true,
        validate: value => value === this.metadata.type,
        validationError: `Type can only be '${this.metadata.type}'.`
      }),
      name: new StringField({
        required: true,
        initial: () => game.i18n.localize("ARTICHRON.CLOCK.FIELDS.name.initial")
      }),
      value: new NumberField({min: 0, integer: true, initial: 0, nullable: false}),
      max: new NumberField({min: 1, integer: true, initial: 8, nullable: false}),
      color: new ColorField({required: true, nullable: false, initial: () => this.metadata.color})
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.CLOCK"];

  /* -------------------------------------------------- */

  /**
   * The id of this clock.
   * @type {string}
   */
  get id() {
    return this._id;
  }

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {ActorArtichron}
   */
  get actor() {
    return this.parent.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Increase the counter by one.
   * @returns {Promise}
   */
  async increase() {
    const value = Math.clamp(this.value + 1, 0, this.max);
    const update = {[`system.clocks.${this.id}.value`]: value};
    return this.actor.update(update);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the counter by one.
   * @returns {Promise}
   */
  async decrease() {
    const value = Math.clamp(Math.min(this.value, this.max) - 1, 0, this.max);
    const update = {[`system.clocks.${this.id}.value`]: value};
    return this.actor.update(update);
  }
}

/* -------------------------------------------------- */

class BadClock extends Clock {
  /**
   * Bad clock metadata.
   * @type {object}
   */
  static metadata = Object.freeze({
    type: "bad",
    color: "#FF0000"
  });
}

/* -------------------------------------------------- */

class GoodClock extends Clock {
  /**
   * Good clock metadata.
   * @type {object}
   */
  static metadata = Object.freeze({
    type: "good",
    color: "#0000FF"
  });
}
