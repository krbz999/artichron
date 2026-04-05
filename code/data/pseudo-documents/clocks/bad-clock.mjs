import BaseClock from "./base-clock.mjs";

export default class BadClock extends BaseClock {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      color: "#FF0000",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "bad";
  }
}
