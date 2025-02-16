const { NumberField } = foundry.data.fields;

export default class FormulaModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {
      denomination: new NumberField({
        nullable: false,
        initial: 6,
        choices: {
          2: "d2",
          3: "d3",
          4: "d4",
          6: "d6",
          8: "d8",
          10: "d10",
          12: "d12",
          20: "d20",
          100: "d100",
        },
      }),
      number: new NumberField({
        integer: true,
        nullable: false,
        initial: 1,
        min: 1,
      }),
    };
  }

  /* -------------------------------------------------- */

  /**
   * The full formula.
   * @type {string}
   */
  get formula() {
    return `${this.number}d${this.denomination}`;
  }
}
