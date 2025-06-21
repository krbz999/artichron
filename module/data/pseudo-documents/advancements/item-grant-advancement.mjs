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
        for (const [itemUuid, { item }] of Object.entries(node.choices))
          if (!node.isChoice || node.selected[itemUuid]) prepareItem(item);

    return Array.from(items.values());
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static async configureNode(node) {
    const options = Object.values(node.choices).map(choice => ({
      value: choice.item.uuid,
      label: choice.item.name,
      selected: node.selected[choice.item.uuid] === true,
    }));

    const contentLinks = Object.values(node.choices).map(choice => `<li>${choice.item.toAnchor().outerHTML}</li>`).join("");

    const input = foundry.applications.fields.createMultiSelectInput({
      options,
      name: "uuids",
      type: "checkboxes",
    });

    const result = await artichron.applications.api.Dialog.input({
      content: `<ul>${contentLinks}</ul>${input.outerHTML}`,
    });
    if (!result) return false;

    for (const { value: uuid } of options) node.selected[uuid] = result.uuids.includes(uuid);
    return true;
  }
}
