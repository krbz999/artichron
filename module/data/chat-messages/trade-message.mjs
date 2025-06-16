import ChatMessageSystemModel from "./system-model.mjs";

const { BooleanField, DocumentUUIDField, JSONField } = foundry.data.fields;

export default class TradeMessageData extends ChatMessageSystemModel {
  /** @inheritdoc */
  static defineSchema() {
    return {
      itemData: new JSONField(),
      actor: new DocumentUUIDField({ type: "Actor" }),
      target: new DocumentUUIDField({ type: "Actor" }),
      traded: new BooleanField(),
    };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  prepareDerivedData() {
    try {
      const actor = this.actor.startsWith("Compendium") ? null : fromUuidSync(this.actor);
      const target = this.target.startsWith("Compendium") ? null : fromUuidSync(this.target);
      this.actor = (actor && target) ? actor : null;
      this.target = (actor && target) ? target : null;
    } catch (err) {
      this.actor = null;
      this.target = null;
    }
  }

  /* -------------------------------------------------- */

  /**
   * An ephemeral item constructed from the saved item data.
   * @type {ItemArtichron|null}
   */
  get item() {
    if (!this.itemData || !this.actor || this.traded) return null;
    const Cls = foundry.utils.getDocumentClass("Item");
    return new Cls(this.itemData, { parent: this.actor });
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async adjustHTML(html) {
    // await super.adjustHTML(html);

    const template = "systems/artichron/templates/chat/trade-message.hbs";
    html.querySelector(".message-content").innerHTML = await foundry.applications.handlebars.renderTemplate(template, {
      traded: this.traded,
      item: this.item,
      actor: this.actor,
      target: this.target,
      isTarget: !!this.target?.isOwner,
      canCancel: !!this.actor?.isOwner && !!this.parent.isAuthor,
    });

    html.querySelector("[data-action=acceptTrade]")?.addEventListener("click", this.#onAcceptTrade.bind(this));
    html.querySelector("[data-action=cancelTrade]")?.addEventListener("click", this.#onCancelTrade.bind(this));
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on the Accept Trade button.
   * @param {PointerEvent} event    Initiating click event.
   */
  async #onAcceptTrade(event) {
    event.currentTarget.disabled = true;

    const canAccept = !this.traded && !!this.target?.isOwner;
    if (!canAccept) return;

    const emit = await artichron.utils.sockets.acceptTrade(this.parent);
    if (emit === false) return;

    const item = this.item;
    const existing = this.target.items.find(i => {
      return i.system.schema.has("quantity") && (i.type === item.type) && (i.system.identifier === item.system.identifier);
    });

    if (existing) {
      existing.update({ "system.quantity.value": existing.system.quantity.value + item.system.quantity.value });
    } else {
      const itemData = game.items.fromCompendium(item);
      this.target.createEmbeddedDocuments("Item", [itemData]);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on the Cancel Trade button.
   * @param {PointerEvent} event    Initiating click event.
   */
  async #onCancelTrade(event) {
    const canCancel = !this.traded && !!this.actor.isOwner && this.parent.isAuthor;
    if (!canCancel) return;

    const item = this.item;
    const existing = this.actor.items.find(i => {
      return i.system.schema.has("quantity") && (i.type === item.type) && (i.system.identifier === item.system.identifier);
    });

    if (existing) {
      await existing.update({ "system.quantity.value": existing.system.quantity.value + item.system.quantity.value });
    } else {
      const itemData = game.items.fromCompendium(item);
      await this.actor.createEmbeddedDocuments("Item", [itemData], { keepId: true });
    }
    this.parent.delete();
  }
}
