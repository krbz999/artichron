import AdvancementChain from "../../../utils/advancement-chain.mjs";
import TypedPseudoDocument from "../typed-pseudo-document.mjs";

export default class BaseAdvancement extends TypedPseudoDocument {
  /** @type {import("../../../_types").PseudoDocumentMetadata} */
  static get metadata() {
    return {
      ...super.metadata,
      documentName: "Advancement",
      defaultImage: "systems/artichron/assets/icons/pseudo/advancement.svg",
      embedded: {},
      sheetClass: artichron.applications.sheets.pseudo.AdvancementSheet,
      types: artichron.data.pseudoDocuments.advancements,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {});
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ADVANCEMENT"];

  /* -------------------------------------------------- */

  /**
   * The point investments at which this advancement applies.
   * @type {number[]}
   */
  get levels() {
    return [];
  }

  /* -------------------------------------------------- */

  /**
   * Configure the choices of a node.
   * @param {AdvancementChain} node   The node to be configured. Will be mutated unless cancelled.
   * @returns {Promise<boolean>}      Whether the node was configured.
   */
  static async configureNode(node) {
    return false;
  }
}
