import TypedPseudoDocument from "../typed-pseudo-document.mjs";

export default class BaseArmorRequirement extends TypedPseudoDocument {
  /** @type {import("../../../_types").ArmorRequirementMetadata} */
  static get metadata() {
    return {
      ...super.metadata,
      documentName: "ArmorRequirement",
      defaultImage: "systems/artichron/assets/icons/pseudo/armor-requirement.svg",
      embedded: {},
      hint: "",
      types: artichron.data.pseudoDocuments.armorRequirements,
      sheetClass: artichron.applications.sheets.pseudo.ArmorRequirementSheet,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.REQUIREMENT",
  ];

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
   * @returns {string}    The content.
   */
  toRequirement() {
    return "";
  }
}
