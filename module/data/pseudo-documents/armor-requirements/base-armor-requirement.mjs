import PseudoDocument from "../../pseudo-document.mjs";

export default class BaseArmorRequirement extends PseudoDocument {
  /** @type {import("../../../_types").ArmorRequirementMetadata} */
  static get metadata() {
    return {
      documentName: "ArmorRequirement",
      embedded: {},
      hint: "",
      label: "",
      types: artichron.data.pseudoDocuments.armorRequirements,
    };
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
   * @returns {string}    The content.
   */
  toRequirement() {
    return "";
  }
}
