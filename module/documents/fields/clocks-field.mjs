const { ColorField, NumberField, StringField } = foundry.data.fields;

/**
 * Base clock data model.
 */
export default class Clock extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      _id: new StringField({
        required: true,
        blank: false,
        readonly: true,
        initial: () => foundry.utils.randomID(),
      }),
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
    const update = { [`system.clocks.${this.id}.value`]: value };
    return this.actor.update(update);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the counter by one.
   * @returns {Promise}
   */
  async decrease() {
    const value = Math.clamp(Math.min(this.value, this.max) - 1, 0, this.max);
    const update = { [`system.clocks.${this.id}.value`]: value };
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
