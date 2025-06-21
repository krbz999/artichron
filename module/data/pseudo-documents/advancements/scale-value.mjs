import BaseAdvancement from "./base-advancement.mjs";

const { NumberField, SchemaField, StringField, TypedObjectField } = foundry.data.fields;

export default class ScaleValueAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      subtype: new StringField({
        choices: () => artichron.config.ADVANCEMENT_SCALE_VALUE_TYPES,
        initial: "number",
        required: true,
      }),
      identifier: new artichron.data.fields.IdentifierField(),
      increases: new TypedObjectField(new SchemaField({
        number: new NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
        faces: new NumberField({ min: 0, integer: true, nullable: false, initial: 0 }),
      }), { validateKey: key => artichron.utils.isIntegerLike(key, { sign: 1 }) }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "scaleValue";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.SCALE_VALUE",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return Object.keys(this.increases).map(n => Number(n)).sort((a, b) => a - b);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get invalidAdvancement() {
    return foundry.utils.isEmpty(this.increases);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareBaseData() {
    super.prepareBaseData();
    this.identifier ||= this.name.slugify({ strict: true });
  }

  /* -------------------------------------------------- */

  /**
   * Get the scale value's increase as a sum of a given range of investment.
   * @param {number} min
   * @param {number} max
   * @returns {Record<string, number>}
   */
  getRangeIncrease(min, max) {
    let number = 0;
    let faces = 0;
    for (let i = min; i <= max; i++) {
      number = number + (this.increases[i]?.number ?? 0);
      faces = faces + (this.increases[i]?.faces ?? 0);
    }

    switch (this.subtype) {
      case "number": return { number };
      case "dice": return { number, faces };
    }
  }
}
