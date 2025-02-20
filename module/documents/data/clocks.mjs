import ActorArtichron from "../actor.mjs";

const { ColorField, DocumentIdField, NumberField, StringField } = foundry.data.fields;

/**
 * Base clock data model.
 */
export default class Clock extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      _id: new DocumentIdField({ initial: () => foundry.utils.randomID() }),
      type: new StringField({
        initial: () => this.metadata.type,
        required: true,
        blank: false,
        readonly: true,
        validate: value => value === this.metadata.type,
        validationError: `Type can only be '${this.metadata.type}'.`,
      }),
      name: new StringField({
        required: true,
        initial: () => game.i18n.localize(`ARTICHRON.CLOCK.FIELDS.name.initial.${this.metadata.type}`),
      }),
      value: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
      max: new NumberField({ min: 1, integer: true, initial: 8, nullable: false }),
      color: new ColorField({ required: true, nullable: false, initial: () => this.metadata.color }),
    };
  }

  /* -------------------------------------------------- */

  static get TYPES() {
    return {
      [BadClock.metadata.type]: BadClock,
      [GoodClock.metadata.type]: GoodClock,
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
    return this.update({ value: value });
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the counter by one.
   * @returns {Promise}
   */
  async decrease() {
    const value = Math.clamp(Math.min(this.value, this.max) - 1, 0, this.max);
    return this.update({ value: value });
  }

  /* -------------------------------------------------- */

  /**
   * Create a new clock.
   * @param {ActorArtichron} actor          The actor to create the clock on.
   * @param {object} [data]                 The data to use for the creation.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  static async create(actor, data = {}) {
    const id = foundry.utils.randomID();
    const type = data.type ?? "good";
    return actor.update({ [`system.clocks.${id}`]: { ...data, type, _id: id } });
  }

  /* -------------------------------------------------- */

  /**
   * Delete this clock.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async delete() {
    return this.actor.update({ [`system.clocks.-=${this.id}`]: null });
  }

  /* -------------------------------------------------- */

  /**
   * Update this clock.
   * @param {object} [change]               The update to perform.
   * @param {object} [operation]            The update context.
   * @returns {Promise<ActorArtichron>}     A promise that resolves to the updated actor.
   */
  async update(change = {}, operation = {}) {
    return this.actor.update({ [`system.clocks.${this.id}`]: change }, operation);
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
    color: "#FF0000",
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
    color: "#0000FF",
  });
}
