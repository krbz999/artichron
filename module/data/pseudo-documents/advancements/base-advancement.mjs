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
      defaultImage: "systems/artichron/assets/icons/advancement.svg",
      embedded: {},
      sheetClass: artichron.applications.sheets.item.AdvancementSheet,
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
   * Retrieve and prepare items to be created on an actor. The data is prepared in such a way that
   * the items should be created with `keepId: true`.
   * @param {foundry.documents.Actor} actor   The actor on which to create the items.
   * @param {AdvancementChain[]} [roots=[]]   The fully configured advancement chains.
   * @returns {Promise<object[]>}             A promise that resolves to the prepared item data.
   */
  static async prepareItems(actor, roots = []) {
    // Mapping of items' original id to the current item data. Used to find and set `itemId`.
    const items = new foundry.utils.Collection();

    // The item being prepared and the advancement that granted it.
    const prepareItem = (item, advancement) => {
      const data = game.items.fromCompendium(item, { keepId: true });
      if (actor.items.has(data._id)) data._id = foundry.utils.randomID();
      foundry.utils.mergeObject(data, {
        "flags.artichron.advancement": {
          itemId: items.get(advancement.document.id)?._id, // is undefined in the case of Path items
          advancementId: advancement.id,
          advancementUuid: advancement.uuid,
        },
      });
      items.set(item.id, data);
    };

    // FIXME: Enough data needs to be stored such that it will be easy to
    // undo a whole chain of added items and advancements. If the path item
    // is not stored, what is the 'entry point'? What can be 'undone' on the
    // actor sheet?

    // Traverse the chains to gather all items.
    for (const root of roots)
      for (const node of root.active())
        for (const { item, selected } of node.pool)
          if (selected !== false) prepareItem(item, node.advancement);

    return Array.from(items.values());
  }
}
