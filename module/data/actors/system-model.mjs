const { NumberField, SchemaField } = foundry.data.fields;

export default class ActorSystemModel extends foundry.abstract.TypeDataModel {
  /** @type {import("../../_types").ActorSubtypeMetadata} */
  static get metadata() {
    return {
      embedded: {},
      icon: "",
      type: "",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return {
      currency: new SchemaField({
        funds: new NumberField({ integer: true, min: 0, initial: 0, nullable: false }),
      }),
    };
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return { ...this };
  }

  /* -------------------------------------------------- */
  /*   Life-cycle methods                               */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ACTOR"];

  /* -------------------------------------------------- */

  /**
   * The properties that can target this document when using active effects.
   * @type {Set<string>}
   */
  static get BONUS_FIELDS() {
    return new Set(["name", "img"]);
  }
}
