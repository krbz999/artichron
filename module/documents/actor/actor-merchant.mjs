import MerchantConfigurationDialog from "../../applications/actor/merchant-configuration-dialog.mjs";
import ActorArtichron from "../actor.mjs";
import ChatMessageArtichron from "../chat-message.mjs";
import ItemArtichron from "../item.mjs";
import ActorSystemModel from "./system-model.mjs";

const { DocumentIdField, HTMLField, SchemaField, SetField, StringField, TypedObjectField } = foundry.data.fields;

export default class MerchantData extends ActorSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ActorSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "merchant",
  });

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static defineSchema() {
    return Object.assign(super.defineSchema(), {
      shop: new SchemaField({
        name: new StringField({ required: true }),
        staged: new TypedObjectField(new SetField(new DocumentIdField()), {
          validateKey: key => foundry.data.validators.isValidId(key),
        }),
      }),
      biography: new SchemaField({
        value: new HTMLField({ required: true }),
      }),
    });
  }

  /* -------------------------------------------------- */

  /**
   * Reference to an existing configuration dialog.
   * @type {MerchantConfigurationDialog}
   */
  #config;

  /* -------------------------------------------------- */

  /* -------------------------------------------------- */
  /*   Preparation methods                              */
  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    super.prepareDerivedData();

    this.shop.name ||= this.parent.name;

    for (const ids of Object.values(this.shop.staged)) {
      for (const id of ids)
        if (!this.parent.items.has(id))
          ids.delete(id);
    }
  }

  /* -------------------------------------------------- */
  /*   Instance methods                                 */
  /* -------------------------------------------------- */

  /**
   * Render the merchant configuration dialog for this actor.
   * @returns {MerchantConfigurationDialog}
   */
  configure() {
    if (!this.#config) this.#config = new MerchantConfigurationDialog({ document: this.parent });
    this.#config.render({ force: true });
    return this.#config;
  }

  /* -------------------------------------------------- */

  /**
   * Move an item from the stock area to the cart area.
   * @param {ActorArtichron} actor      The actor making the purchase.
   * @param {ItemArtichron} item        The item being purchased.
   * @returns {Promise<boolean>}        Whether the item was moved.
   */
  async stageItem(actor, item) {
    if (item.parent !== this.parent) {
      throw new Error("You cannot stage an item the merchant does not have.");
    }
    const ids = [...this.shop.staged[actor.id] ?? []];
    ids.push(item.id);
    await this.parent.update({ [`system.shop.staged.${actor.id}`]: ids });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Move an item from the cart area to the stock area.
   * @param {ActorArtichron} actor      The actor cancelling the purchase.
   * @param {ItemArtichron} item        The item being cancelled.
   * @returns {Promise<boolean>}        Whether the item was moved.
   */
  async unstageItem(actor, item) {
    const ids = this.shop.staged[actor.id] ?? new Set();
    if (!ids.has(item.id)) {
      throw new Error("You cannot unstage an item that is not staged.");
    }
    ids.delete(item.id);
    await this.parent.update({ [`system.shop.staged.${actor.id}`]: [...ids] });
    return true;
  }

  /* -------------------------------------------------- */

  /**
   * Complete the purchase of any items in the cart.
   * @param {object} [options]                Purchasing options.
   * @param {boolean} [options.displayChat]   Whether to display a chat message with a receipt.
   * @returns {Promise}
   */
  async finalizePurchase({ displayChat = true } = {}) {
    if (!this.parent.isOwner) {
      throw new Error(`You are not owner of merchant ${this.parent.uuid}.`);
    }

    const toDelete = [];
    /** @type {Map<ActorArtichron, Set<ItemArtichron>>} */
    const toCreate = new Map();

    for (const [actorId, itemIds] of Object.entries(this.shop.staged)) {
      const actor = game.actors.get(actorId);
      if (!actor) continue;

      if (!actor.isOwner) throw new Error(`You are not owner of actor ${actor.uuid}.`);

      if (!toCreate.get(actor)) toCreate.set(actor, new Set());
      const items = toCreate.get(actor);
      for (const itemId of itemIds) {
        const item = this.parent.items.get(itemId);
        if (!item) continue;
        if (toDelete.includes(itemId)) {
          throw new Error(`Item with uuid ${item.uuid} has been staged twice.`);
        }
        items.add(item);
        toDelete.push(item.id);
      }
    }

    const receipt = [];
    let spent = 0;
    await this.parent.deleteEmbeddedDocuments("Item", toDelete, { isShopping: true });
    for (const [actor, items] of toCreate.entries()) {
      if (!items.size) continue;
      const itemData = Array.from(items).map(item => game.items.fromCompendium(item));
      const created = await actor.createEmbeddedDocuments("Item", itemData, { isShopping: true });
      const total = created.reduce((acc, item) => acc + item.system.price.value, 0);
      await actor.update({ "system.currency.value": actor.system.currency.value - total });
      receipt.push({
        actor, total,
        items: created,
      });
      spent += total;
    }

    if (displayChat) {
      const template = "systems/artichron/templates/chat/receipt.hbs";
      const context = {
        customers: receipt,
        shop: this.shop.name,
        total: spent,
      };
      ChatMessageArtichron.create({
        content: await foundry.applications.handlebars.renderTemplate(template, context),
        speaker: ChatMessageArtichron.getSpeaker({ actor: this.parent }),
      });
    }
  }
}
