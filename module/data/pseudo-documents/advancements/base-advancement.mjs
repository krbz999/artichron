import AdvancementChain from "../../../utils/advancement-chain.mjs";
import TypedPseudoDocument from "../typed-pseudo-document.mjs";

const {
  NumberField, SchemaField,
} = foundry.data.fields;

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
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        // How many points are required to unlock this
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = ["ARTICHRON.ADVANCEMENT"];

  /* -------------------------------------------------- */

  /**
   * Determine inheritance chain for item granting.
   * @param {AdvancementChain|null} [parent=null]   The 'parent' link in the chain.
   * @param {number} [_depth=0]                     Current tree level.
   * @returns {AdvancementChain}
   */
  async determineChain(parent = null, _depth = 0) {
    const leaf = new artichron.utils.AdvancementChain({
      advancement: this,
      children: {},
      depth: _depth,
      parent,
      pool: [],
      root: _depth === 0,
    });

    if (this.type === "itemGrant") {
      for (const { uuid, ...rest } of this.pool) {
        const item = await fromUuid(uuid);
        if (!item) continue;
        leaf.pool.push({ item, selected: !rest.optional, ...rest });

        if (!item.supportsAdvancements) continue;
        for (const advancement of item.getEmbeddedPseudoDocumentCollection("Advancement")) {
          leaf.children[advancement.id] = await advancement.determineChain(leaf, _depth + 1);
        }
      }
    }

    return leaf;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve all items from a set of roots. Use case???
   * @param {AdvancementChain[]} [roots=[]]   The roots of the advancement.
   * @returns {foundry.documents.Item[]}      Possible granted items.
   */
  static retrieveItemsFromChain(roots = []) {
    const items = [];
    for (const root of roots)
      for (const node of root.active())
        for (const { item, selected } of node.pool)
          if (selected !== false) items.push(item);
    return items;
  }

  /* -------------------------------------------------- */

  /**
   * Find all items on an actor that were granted by this specific advancement.
   * @returns {foundry.documents.Item[]|null}
   */
  grantedItems() {
    const item = this.document;
    if (!item.isEmbedded) return null;

    return item.collection.filter(i => {
      if (i === item) return false;
      const { advancementId, itemId } = i.getFlag("artichron", "advancement") ?? {};
      return (itemId === item.id) && (advancementId === this.id);
    });
  }

  /* -------------------------------------------------- */

  /**
   * Find all items on an actor that would be removed were this advancement undone (e.g. the item deleted).
   * @returns {foundry.documents.Item[]}    An array of to-be-deleted items.
   */
  grantedItemsChain() {
    const items = this.grantedItems();
    for (const item of [...items]) {
      if (!item.supportsAdvancements) continue;
      for (const advancement of item.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant")) {
        items.push(...advancement.grantedItemsChain());
      }
    }
    return items;
  }

  /* -------------------------------------------------- */

  /**
   * Retrieve all advancements in a chain.
   * @param {AdvancementChain[]} [roots=[]]   The roots of the advancement.
   * @returns {(typeof BaseAdvancement)[]}
   */
  static retrieveAdvancementsFromChain(roots = []) {
    const items = [];
    for (const root of roots)
      for (const node of root.active())
        items.push(node.advancement);
    return items;
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

    const collection = item.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant");
    if (!collection.length) return [];

    const chains = [];
    for (const advancement of collection) {
      const validRange = advancement.requirements.points.between(range[0], range[1]);
      if (validRange) chains.push(await advancement.determineChain());
    }
    if (!chains.length) return [];

    const configuration = await artichron.applications.apps.advancement.ChainConfigurationDialog.create({ chains });
    if (!configuration) return null;

    const id = item.identifier;

    // The items that will be created. The root item is handled elsewhere.
    const items = new foundry.utils.Collection();
    const prepareItem = item => {
      const keepId = !actor.items.has(item._id) && !items.has(item._id);
      const data = game.items.fromCompendium(item, { keepId });
      foundry.utils.setProperty(data, "flags.artichron.advancement.path", id);
      if (!keepId) data._id = foundry.utils.randomID();
      items.set(data._id, data);
    };

    // Traverse the chains to gather all items.
    for (const root of chains)
      for (const node of root.active())
        for (const { item, selected } of node.pool)
          if (selected) prepareItem(item);

    return Array.from(items.values());
  }
}
