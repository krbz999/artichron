import BaseClock from "./base-clock.mjs";

export default class GoodClock extends BaseClock {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      color: "#0000FF",
      defaultName: "ARTICHRON.CLOCK.FIELDS.name.initial.good",
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "good";
  }
}
