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
   * Perform the advancement flow.
   * @param {foundry.documents.Actor} actor   The actor being targeted by advancements.
   * @param {foundry.documents.Item} item     The path item which holds advancements.
   * @param {object} options                  Advancement options.
   * @param {number[]} options.range          The range of the advancements to trigger, a two-length array of integers.
   * @returns {Promise<object[]|null>}        A promise that resolves to the item data that is to be created.
   *                                          The item data is configured in such a way that they should be
   *                                          created with `keepId: true`.
   */
  static async configureAdvancement(actor, item, { range }) {
    if (item.type !== "path") {
      throw new Error("Cannot trigger advancements with a non-Path item as the root item.");
    }

    // TODO: This method should be moved to the base advancement where it can call subclass methods on the
    // individual advancement subtypes to configure update data. For example, all item creation of course
    // is only handled by item grants, while actor updates (?) are handled by traits - or we might instead
    // handle those changes from Trait advancements by updating the items so this can be handled during data prep.
    // Either way, this should be handled in the base method as it is not specific to just item grants.

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

    const id = item.identifier;

    // Record of sets of strings to store which traits should be marked active on an item's trait advancements.
    const changes = {};

    // The items that will be created. The root item is handled elsewhere.
    const items = new foundry.utils.Collection();

    // Helper method to prepare item data.
    const prepareItem = item => {
      const keepId = !actor.items.has(item._id) && !items.has(item._id);
      item = item.clone({}, { keepId });

      // Make changes to advancements.
      if (item.supportsAdvancements) {
        const path = item.system.constructor.metadata.embedded.Advancement;
        const update = { [path]: {} };
        for (const traitAdv of item.getEmbeddedPseudoDocumentCollection("Advancement").getByType("trait")) {
          for (const traitId of changes[traitAdv.uuid] ?? []) {
            update[path][traitAdv.id] = { [`traits.${traitId}.active`]: true };
          }
        }
        item.updateSource(update);
      }

      const data = game.items.fromCompendium(item, { keepId });
      foundry.utils.setProperty(data, "flags.artichron.advancement.path", id);
      if (!keepId) data._id = foundry.utils.randomID();
      items.set(data._id, data);
    };

    // On the advancement, store what choice was picked.
    for (const root of chains)
      for (const node of root.active())
        if (node.advancement.type === "trait")
          for (const [traitId, choice] of Object.entries(node.choices))
            if (!node.isChoice || node.selected[traitId]) {
              if (!changes[node.advancement.uuid]) changes[node.advancement.uuid] = new Set();
              changes[node.advancement.uuid].add(traitId);
            }

    // Traverse the chains to gather all items.
    // TODO: What about the root item?
    for (const root of chains)
      for (const node of root.active())
        if (node.advancement.type === "itemGrant")
          for (const [itemUuid, { item }] of Object.entries(node.choices))
            if (!node.isChoice || node.selected[itemUuid]) prepareItem(item);

    return Array.from(items.values());
  }

  /* -------------------------------------------------- */

  /**
   * Configure the choices of a node.
   * @param {AdvancementChain} node   The node to be configured. Will be mutated unless cancelled.
   * @returns {Promise<boolean>}      Whether the node was configured.
   */
  static async configureNode(node) {
    // TODO: for the subclasses, implement a custom application.
    return false;
  }
}
