import TypedPseudoDocument from "../typed-pseudo-document.mjs";

const { ColorField, HTMLField, NumberField } = foundry.data.fields;

/**
 * Base clock data model.
 */
export default class BaseClock extends TypedPseudoDocument {
  /** @type {import("../../../_types").ClockMetadata} */
  static get metadata() {
    return {
      ...super.metadata,
      color: "",
      documentName: "Clock",
      embedded: {},
      sheetClass: artichron.applications.sheets.pseudo.ClockSheet,
      types: artichron.data.pseudoDocuments.clocks,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      value: new NumberField({ min: 0, integer: true, initial: null }),
      max: new NumberField({ min: 1, integer: true, initial: null }),
      color: new ColorField({ required: true, nullable: true }),
      description: new HTMLField({ required: true }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.CLOCK"];

  /* -------------------------------------------------- */

  /**
   * The party actor.
   * @type {foundry.documents.Actor}
   */
  get actor() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * Is the clock empty?
   * @type {boolean}
   */
  get isEmpty() {
    return !this.value;
  }

  /* -------------------------------------------------- */

  /**
   * Is the clock full?
   * @type {boolean}
   */
  get isFull() {
    return this.value === this.max;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();
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
    return this.delta(1);
  }

  /* -------------------------------------------------- */

  /**
   * Decrease the counter by one.
   * @returns {Promise}
   */
  async decrease() {
    return this.delta(-1);
  }

  /* -------------------------------------------------- */

  /**
   * Modify the value of the clock by a delta.
   * @param {number} delta    The difference.
   * @returns {Promise}
   */
  async delta(delta) {
    const value = Math.clamp(this.value + delta, 0, this.max);
    return this.update({ value: value });
  }
}
