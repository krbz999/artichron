import AdvancementChain from "../../../utils/advancement-chain.mjs";
import TypedPseudoDocument from "../typed-pseudo-document.mjs";

const {
  StringField,
} = foundry.data.fields;

export default class BaseAdvancement extends TypedPseudoDocument {
  /** @type {import("../../../_types").PseudoDocumentMetadata} */
  static get metadata() {
    return {
      documentName: "Advancement",
      embedded: {},
      sheetClass: null,
      types: artichron.data.pseudoDocuments.advancements,
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      name: new StringField({ required: true }),
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
      parent,
      pool: [],
      root: _depth === 0,
    });

    if (this.type === "itemGrant") {
      for (const { uuid, ...rest } of this.pool ?? []) {
        const item = await fromUuid(uuid);
        if (!item) continue;
        leaf.pool.push({ item, selected: null, ...rest });

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
   * Find all items on an actor that were granted by this advancement.
   */
  grantedItems() {
    const item = this.document;
    if (!item.isEmbedded) return null;

    return item.collection.filter(i => {
      if (i === item) return false;
      const { advancementId, itemId } = i.getFlag("artichron", "advancement") ?? {};
      return (itemId === i.id) && (advancementId === this.id);
    });
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
   * Retrieve and prepare items to be created on an actor.
   * @param {AdvancementChain[]} [roots=[]]   The roots of the advancement.
   * @returns {object[]}                      Prepared item data.
   */
  static prepareItems(roots = []) {
    const itemData = [];
    for (const root of roots)
      for (const node of root.active())
        for (const { item, selected } of node.pool)
          if (selected !== false) itemData.push(node.advancement.prepareItem(item));
    return itemData;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare an item to be created on an actor.
   * @param {foundry.documents.Item} item   The item to prepare.
   * @returns {object}
   */
  prepareItem(item) {
    item = game.items.fromCompendium(item);
    foundry.utils.mergeObject(item.flags, {
      artichron: { itemId: this.document.id, advancementId: this.id },
    });
    return item;
  }
}
