import ActorArtichron from "../actor.mjs";
import ItemArtichron from "../item.mjs";
import ActorSystemModel from "./system-model.mjs";

const { HTMLField, SchemaField, StringField } = foundry.data.fields;

export default class MerchantData extends ActorSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "merchant",
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      shop: new StringField({ required: true }),
      biography: new SchemaField({
        value: new HTMLField({ required: true }),
      }),
    });
  }

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Move an item from the stock area to the cart area.
   * @param {ItemArtichron} item      The item to move.
   * @returns {Promise<boolean>}      Whether the item was moved.
   */
  async stageItem(item) {
    const items = this.stagedItems;
    const bool = items.has(item);
    if (!bool) {
      items.add(item);
      await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    }
    return !bool;
  }

  /* -------------------------------------------------- */

  /**
   * Move an item from the cart area to the stock area.
   * @param {ItemArtichron} item      The item to move.
   * @returns {Promise<boolean>}      Whether the item was moved.
   */
  async unstageItem(item) {
    const items = this.stagedItems;
    const bool = items.has(item);
    if (bool) {
      items.delete(item);
      await this.parent.setFlag("artichron", "stagedItems", Array.from(items).map(k => k.id));
    }
    return bool;
  }

  /* -------------------------------------------------- */

  /**
   * Complete the purchase of any items in the cart.
   * @returns {Promise<ItemArtichron[]>}      A promise that resolves to the purchased, created items.
   */
  async finalizePurchase() {
    const items = this.stagedItems;
    if (!items.size) return;

    const party = game.settings.get("artichron", "primaryParty").actor;
    if (!this.parent.isOwner || !party?.isOwner) {
      throw new Error("You must be owner of both the primary party and the merchant to finalize a purchase!");
    }

    const total = items.reduce((acc, item) => acc + item.system.price.value, 0);
    const funds = party.system.currency.funds;
    if (total > funds) throw new Error("You do not have sufficient funds.");

    const itemData = Array.from(items).map(item => game.items.fromCompendium(item));
    const created = await party.createEmbeddedDocuments("Item", itemData);
    await party.update({ "system.currency.funds": funds - total });
    await this.parent.deleteEmbeddedDocuments("Item", Array.from(items).map(item => item.id));
    await this.parent.setFlag("artichron", "stagedItems", []);

    this.#createReceipt(party, created, total);

    return created;
  }

  /* -------------------------------------------------- */

  /**
   * Create a chat message showing what was purchased.
   * @param {ActorArtichron} party      The party actor.
   * @param {ItemArtichron[]} items     The purchased items.
   * @param {number} total              The amount spent.
   */
  async #createReceipt(party, items, total) {
    const template = "systems/artichron/templates/chat/receipt.hbs";
    const context = {
      name: party.name,
      total: total,
      items: items,
      shop: this.parent.system.shop || this.parent.name,
    };
    const content = await renderTemplate(template, context);
    ChatMessage.implementation.create({
      content: content,
      speaker: ChatMessage.implementation.getSpeaker({ actor: this.parent }),
    });
  }

  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The items that are currently in the 'cart' area.
   * @type {Set<ItemArtichron>}
   */
  get stagedItems() {
    const ids = this.parent.getFlag("artichron", "stagedItems") ?? [];
    const items = new Set();
    for (const id of ids) {
      const item = this.parent.items.get(id);
      if (item) items.add(item);
    }
    return items;
  }
}
