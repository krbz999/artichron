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
   * Configure this advancement such that all choices have been made. Optionally also apply
   * these choices to a node in an advancement chain.s
   * @param {AdvancementChain} [node]   A node that is configured in-place and used to gather options. **will be mutated**
   * @returns {Promise<object>}         A promise that resolves to an update to perform on the parent of the advancement.
   */
  async configureAdvancement(node = null) {
    return {};
  }

  /* -------------------------------------------------- */

  /**
   * Perform the advancement flow.
   * @param {foundry.documents.Item} item           The path item which holds advancements.
   * @param {object} options                        Advancement options.
   * @param {number[]} options.range                The range of the advancements to trigger, a two-length array of integers.
   * @returns {Promise<AdvancementChain[]|null>}    A promise that resolves to the configured advancement chains.
   */
  static async performAdvancementFlow(item, { range }) {
    if (item.type !== "path") {
      throw new Error("Cannot trigger advancements with a non-Path item as the root item.");
    }

    const collection = item.getEmbeddedPseudoDocumentCollection("Advancement");
    if (!collection.size) return [];

    const chains = [];
    for (const advancement of collection) {
      const validRange = advancement.levels.some(level => level.between(range[0], range[1]));
      if (validRange) chains.push(await artichron.utils.AdvancementChain.create(advancement));
    }
    if (!chains.length) return [];

    const configuration = await artichron.applications.apps.advancement.ChainConfigurationDialog.create({ chains });
    if (!configuration) return null;
    return chains;
  }
}
