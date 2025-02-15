import DamageFormulaModel from "./damage-formula-model.mjs";
import ItemArtichron from "../item.mjs";
import MappingField from "./mapping-field.mjs";

export default class DamagesField extends MappingField {
  constructor(options) {
    super(new DamageField(), options);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  initialize(value, model, options) {
    return new DamageCollection(model, super.initialize(value, model, options));
  }
}

/* -------------------------------------------------- */

/**
 * Field that stores damage parts.
 */
class DamageField extends foundry.data.fields.ObjectField {
  /** @override */
  static recursive = true;

  /* -------------------------------------------------- */

  /** @override */
  _cleanType(value, options) {
    if (!(typeof value === "object")) value = {};
    return DamageFormulaModel.cleanData(value, options);
  }

  /* -------------------------------------------------- */

  /** @override */
  initialize(value, model, options = {}) {
    return new DamageFormulaModel(value, { parent: model, ...options });
  }

  /* -------------------------------------------------- */

  /**
   * Migrate this field's candidate source data.
   * @param {object} sourceData  Candidate source data of the root model.
   * @param {any} fieldData      The value of this field within the source data.
   */
  migrateSource(sourceData, fieldData) {
    DamageFormulaModel.migrateDataSafe(fieldData);
  }
}

/* -------------------------------------------------- */

/**
 * Specialized collection type for stored damage parts.
 * @param {DataModel} model                                 The parent DataModel to which this DamageCollection belongs.
 * @param {Record<string, DamageFormulaModel>} entries      Object containing the damage parts to store.
 */
class DamageCollection extends foundry.utils.Collection {
  constructor(model, entries) {
    super();
    this.#model = model;
    for (const [id, entry] of Object.entries(entries)) {
      if (!(entry instanceof DamageFormulaModel)) continue;
      this.set(id, entry);
    }
  }

  /* -------------------------------------------------- */
  /*  Properties                                        */
  /* -------------------------------------------------- */

  /**
   * The parent DataModel to which this DamageCollection belongs.
   * @type {DataModel}
   */
  #model;

  /* -------------------------------------------------- */

  /**
   * The activity.
   * @type {BaseActivity}
   */
  get activity() {
    return this.#model;
  }

  /* -------------------------------------------------- */

  /**
   * The item that has this activity.
   * @type {ItemArtichron}
   */
  get item() {
    return this.activity.item;
  }

  /* -------------------------------------------------- */
  /*  Methods                                           */
  /* -------------------------------------------------- */

  /**
   * Test the given predicate against every entry in the Collection.
   * @param {function(*, number, DamageCollection): boolean} predicate     The predicate.
   * @returns {boolean}
   */
  every(predicate) {
    return this.reduce((pass, v, i) => pass && predicate(v, i, this), true);
  }

  /* -------------------------------------------------- */

  /**
   * Convert the DamageCollection to an array of simple objects.
   * @param {boolean} [source=true]  Draw data for contained Documents from the underlying data source?
   * @returns {object[]}             The extracted array of primitive objects.
   */
  toObject(source = true) {
    return this.map(doc => doc.toObject(source));
  }

  /* -------------------------------------------------- */

  /**
   * Create a new damage part.
   * @param {object} [data]     Damage part data.
   * @returns {Promise}
   */
  async createDamage(data = {}) {
    const id = foundry.utils.randomID();
    const path = `damage.${id}`;
    return this.activity.update({ [path]: { ...data, _id: id } });
  }

  /* -------------------------------------------------- */

  /**
   * Delete a damage part.
   * @param {string} id     The id of the damage part to delete.
   * @returns {Promise}
   */
  async deleteDamage(id) {
    const path = `damage.-=${id}`;
    return this.activity.update(({ [path]: null }));
  }
}
