import BaseAdvancement from "./base-advancement.mjs";

const {
  ArrayField, DocumentUUIDField, NumberField, SchemaField,
} = foundry.data.fields;

export default class ItemGrantAdvancement extends BaseAdvancement {
  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      requirements: new SchemaField({
        // How many points are required to unlock this
        points: new NumberField({ integer: true, min: 1, nullable: false, initial: 1 }),
      }),
      pool: new ArrayField(new SchemaField({
        uuid: new DocumentUUIDField({ embedded: false, type: "Item" }),
      })),
      // If `null`, then this is explicitly a "receive all" - but also if the number is equal to or greater than the pool
      chooseN: new NumberField({ integer: true, nullable: true, initial: null, min: 1 }),
    });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static get TYPE() {
    return "itemGrant";
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ADVANCEMENT.ITEM_GRANT",
  ];

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get levels() {
    return [this.requirements.points];
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  get invalidAdvancement() {
    const items = this.pool.map(p => fromUuidSync(p.uuid)).filter(_ => _);
    return items.length > 0;
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
   * Determine inheritance chain for item granting.
   * @param {AdvancementChain|null} [parent=null]   The 'parent' link in the chain.
   * @param {number} [_depth=0]                     Current tree level.
   * @returns {AdvancementChain}
   */
  async determineChain(parent = null, _depth = 0) {
    const leaf = new artichron.utils.AdvancementChain({
      advancement: this,
      depth: _depth,
      parent,
      choices: {},
      root: _depth === 0,
    });

    // if (this.type === "itemGrant") {
    for (const { uuid, ...rest } of this.pool) {
      const item = await fromUuid(uuid);
      if (!item) continue;

      leaf.choices[item.id] = {
        item,
        ...rest,
        children: {},
      };

      if (!item.supportsAdvancements) continue;
      for (const advancement of item.getEmbeddedPseudoDocumentCollection("Advancement").getByType("itemGrant")) {
        leaf.choices[item.id].children[advancement.id] = await advancement.determineChain(leaf, _depth + 1);
      }

      Object.defineProperty(leaf.choices[item.id], "link", { value: item.toAnchor() });
    }
    // }

    leaf.chooseN = ((this.chooseN === null) || (this.chooseN >= Object.keys(leaf.choices).length))
      ? null // receive all
      : this.chooseN; // choose up to N of the K items (K > N)
    leaf.isChoice = leaf.chooseN !== null;
    leaf.isConfigured = !leaf.isChoice;
    leaf.selected = {};
    Object.defineProperty(leaf, "capped", { get() {
      const count = Object.values(this.selected).reduce((acc, bool) => acc + Boolean(bool), 0);
      return count >= this.chooseN;
    } });

    return leaf;
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
        for (const [itemId, { item }] of Object.entries(node.choices))
          if (!node.isChoice || node.selected[itemId]) prepareItem(item);

    return Array.from(items.values());
  }
}
