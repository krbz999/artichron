import ActorArtichron from "../actor.mjs";
import PseudoDocument from "./pseudo-document.mjs";

const { ColorField, NumberField, StringField } = foundry.data.fields;

/**
 * Base clock data model.
 */
export default class Clock extends PseudoDocument {
  /** @inheritdoc */
  static metadata = Object.freeze({
    documentName: "Clock",
    color: "",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      name: new StringField({
        required: true,
        initial: () => game.i18n.localize(`ARTICHRON.CLOCK.FIELDS.name.initial.${this.metadata.type}`),
      }),
      value: new NumberField({ min: 0, integer: true, initial: 0, nullable: false }),
      max: new NumberField({ min: 1, integer: true, initial: 8, nullable: false }),
      color: new ColorField({
        required: true,
        nullable: false,
        initial: () => this.metadata.color,
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPES() {
    return {
      [BadClock.TYPE]: BadClock,
      [GoodClock.TYPE]: GoodClock,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.CLOCK"];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get _path() {
    return "system.clocks";
  }

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {ActorArtichron}
   */
  get actor() {
    return this.document;
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
}

/* -------------------------------------------------- */

class BadClock extends Clock {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    color: "#FF0000",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "bad";
  }
}

/* -------------------------------------------------- */

class GoodClock extends Clock {
  /** @inheritdoc */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    color: "#0000FF",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "good";
  }
}
