import PseudoDocument from "../../pseudo-document.mjs";

export default class BaseArmorRequirement extends PseudoDocument {
  /** @inheritdoc */
  static get metadata() {
    return {
      documentName: "ArmorRequirement",
      label: "",
      hint: "",
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPES() {
    return this.#TYPES ??= Object.freeze(Object.values(
      artichron.data.pseudoDocuments.armorRequirements,
    ).reduce((acc, Cls) => {
      if (Cls.TYPE) acc[Cls.TYPE] = Cls;
      return acc;
    }, {}));
  }
  static #TYPES;

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get _path() {
    return "system.category.requirements";
  }

  /* -------------------------------------------------- */

  /**
   * The item this data model is embedded on.
   * @type {ItemArtichron}
   */
  get item() {
    return this.document;
  }

  /* -------------------------------------------------- */

  /**
   * Does the actor who owns this item fulfill these requirements?
   * @type {boolean}
   */
  get fulfilledRequirements() {
    return false;
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Convert this requirement to a human-readable string.
   * @returns {string}      The content.
   */
  toRequirement() {
    return "";
  }
}
