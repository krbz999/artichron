import {ActorSystemModel} from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, HTMLField, NumberField, SchemaField} = foundry.data.fields;

export default class MonsterData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.loot = new ArrayField(new SchemaField({
      uuid: new DocumentUUIDField({type: "Item", embedded: false}),
      quantity: new NumberField({min: 1, integer: true, initial: 1})
    }), {
      label: "ARTICHRON.ActorProperty.Loot",
      hint: "ARTICHRON.ActorProperty.LootHint"
    });
    schema.biography = new SchemaField({
      value: new HTMLField({required: true})
    });
    return schema;
  }

  /* -------------------------------------------------- */
  /*   Life-cycle events                                */
  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    return super._preUpdate(update, options, user);
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The items that this monster will drop when killed.
   * @type {object[]}     Objects with an index entry and quantity.
   */
  get lootDrops() {
    const items = new Map();
    for (const {uuid, quantity} of this.loot) {
      try {
        const item = fromUuidSync(uuid);
        if (item) {
          let q = items.get(uuid)?.quantity;
          q = q ? (q + quantity) : quantity;
          items.set(uuid, {item, quantity: q});
        }
      } catch (err) {
        console.warn(err);
        continue;
      }
    }
    return Array.from(items.values());
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Add a new loot item.
   * @param {string} uuid           Uuid of the item.
   * @param {number} [quantity]     The quantity of the item.
   * @returns {Promise<ActorArtichron>}
   */
  async addLootDrop(uuid, quantity = 1) {
    const loot = this.lootDrops.map(({item, quantity}) => ({uuid: item.uuid, quantity}));
    const item = loot.find(l => l.uuid === uuid);
    if (item) item.quantity += quantity;
    else loot.push({uuid, quantity});
    await this.parent.update({"system.loot": loot});
    return this.parent;
  }

  /* -------------------------------------------------- */

  /**
   * Remove a loot item.
   * @param {string} uuid           Uuid of the item.
   * @param {number} [quantity]     The quantity to remove. Omit to remove the entire stack.
   * @returns {Promise<ActorArtichron>}
   */
  async removeLootDrop(uuid, quantity) {
    const removeAll = !Number.isInteger(quantity);
    const loot = this.lootDrops.map(({item, quantity}) => ({uuid: item.uuid, quantity}));
    const item = loot.findSplice(l => l.uuid === uuid);
    if (item && !removeAll) {
      item.quantity -= quantity;
      if (item.quantity > 0) loot.push({uuid, quantity: item.quantity});
    }
    await this.parent.update({"system.loot": loot});
    return this.parent;
  }
}
