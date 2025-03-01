import ClockSheet from "../../applications/clock-sheet.mjs";
import ActorArtichron from "../actor.mjs";
import PseudoDocument from "./pseudo-document.mjs";

const { ColorField, HTMLField, NumberField, StringField } = foundry.data.fields;

/**
 * Base clock data model.
 */
export default class Clock extends PseudoDocument {
  /** @inheritdoc */
  static metadata = Object.freeze({
    documentName: "Clock",
    color: "",
    sheetClass: ClockSheet,
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      name: new StringField({ required: true }),
      value: new NumberField({ min: 0, integer: true, initial: null }),
      max: new NumberField({ min: 1, integer: true, initial: null }),
      color: new ColorField({ required: true, nullable: true }),
      description: new HTMLField({ required: true }),
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

  /** @inheritdoc */
  prepareDerivedData() {
    this.max ??= 8;
    this.value = Math.clamp(this.value, 0, this.max);
    this.color ??= foundry.utils.Color.fromString(this.constructor.metadata.color);
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
    defaultName: "ARTICHRON.CLOCK.FIELDS.name.initial.bad",
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
    defaultName: "ARTICHRON.CLOCK.FIELDS.name.initial.good",
  }, { inplace: false }));

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "good";
  }
}
