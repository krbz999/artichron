import ScaleValueAdvancement from "../../pseudo-documents/advancements/scale-value.mjs";

export default class ScalingValue {
  constructor(actor, advancement, ranges) {
    this.#actor = actor;
    this.#advancement = advancement;
    this.#ranges = ranges;

    this.#configure();
  }

  /* -------------------------------------------------- */

  /**
   * The actor to whom this scaling value belongs.
   * @type {foundry.documents.Actor}
   */
  #actor;

  /* -------------------------------------------------- */

  /**
   * The parent advancement from which data is derived.
   * @type {ScaleValueAdvancement}
   */
  #advancement;

  /* -------------------------------------------------- */

  /**
   * The applicable ranges from which to derive scaling value data.
   * @type {number[][]}
   */
  #ranges;

  /* -------------------------------------------------- */

  /**
   * The numerical representation.
   * @type {number}
   */
  number;

  /* -------------------------------------------------- */

  /**
   * The faces of the dice.
   * @type {number}
   */
  faces;

  /* -------------------------------------------------- */

  /**
   * The die representation.
   * @type {string|null}
   */
  die;

  /* -------------------------------------------------- */

  /**
   * The full formula representation.
   * @type {string}
   */
  formula;

  /* -------------------------------------------------- */

  /**
   * Configure properties.
   */
  #configure() {
    let number = 0;
    let faces = 0;
    for (const [min, max] of this.#ranges) {
      const increase = this.#advancement.getRangeIncrease(min, max);
      number += (increase.number ?? 0);
      faces += (increase.faces ?? 0);
    }

    const isDie = (this.#advancement.subtype === "dice") && !!number && !!faces;

    this.number = number;
    this.faces = isDie ? faces : 0;
    this.die = isDie ? `d${faces}` : null;
    this.formula = isDie ? `${number}d${faces}` : String(number);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  toString() {
    return this.formula;
  }
}
