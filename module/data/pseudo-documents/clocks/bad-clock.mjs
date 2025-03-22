import BaseClock from "./base-clock.mjs";

export default class BadClock extends BaseClock {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      color: "#FF0000",
      defaultName: "ARTICHRON.CLOCK.FIELDS.name.initial.bad",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "bad";
  }
}
