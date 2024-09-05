import ChatMessageSystemModel from "./system-model.mjs";

const {BooleanField, DocumentUUIDField, JSONField} = foundry.data.fields;

export default class TradeMessageData extends ChatMessageSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ChatMessageSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "trade"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      itemData: new JSONField(),
      actor: new DocumentUUIDField({type: "Actor"}),
      target: new DocumentUUIDField({type: "Actor"}),
      traded: new BooleanField()
    };
  }

  /* -------------------------------------------------- */

  /** @override */
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
    const Cls = getDocumentClass("Item");
    return new Cls(this.itemData, {parent: this.actor});
  }

  /* -------------------------------------------------- */

  /** @override */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const template = "systems/artichron/templates/chat/trade-message.hbs";
    html.querySelector(".message-content").innerHTML = await renderTemplate(template, {
      traded: this.traded,
      item: this.item,
      actor: this.actor,
      target: this.target,
      isTarget: !!this.target?.isOwner,
      canCancel: !!this.actor?.isOwner && !!this.parent.isOwner
    });

    html.querySelector("[data-action=acceptTrade]")?.addEventListener("click", this._onAcceptTrade.bind(this));
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on the Accept Trade button.
   * @param {PointerEvent} event     The originating click event.
   */
  async _onAcceptTrade(event) {
    const canAccept = !this.traded && !!this.target?.isOwner;
    if (!canAccept) return;

    const emit = await artichron.utils.sockets.acceptTrade(this.parent);
    if (emit === false) return;

    const button = event.currentTarget;
    button.disabled = true;

    const itemData = game.items.fromCompendium(this.item);
    await this.target.createEmbeddedDocuments("Item", [itemData]);
  }
}

/* -------------------------------------------------- */

Hooks.once("renderChatLog", (app, [html]) => {
  const log = html.querySelector("#chat-log");
  log.addEventListener("drop", _onDropItem);
});

/* -------------------------------------------------- */

async function _onDropItem(event) {
  const data = TextEditor.getDragEventData(event);
  if (data.type !== "Item") return;
  const item = await fromUuid(data.uuid);
  if (!item || !item.isOwner || !item.isEmbedded) return;

  const confirm = await foundry.applications.api.DialogV2.confirm({
    window: {
      title: `Trade ${item.name}?`,
      icon: "fa-solid fa-cart-flatbed-suitcase"
    },
    content: "Target an actor before confirming.",
    rejectClose: false
  });
  if (!confirm) return;

  const actor = game.user.targets.first()?.actor;
  if (!actor) return;

  const message = await ChatMessage.implementation.create({
    type: "trade",
    system: {
      traded: false,
      itemData: game.items.fromCompendium(item, {keepId: true}),
      target: actor.uuid,
      actor: item.actor.uuid
    }
  });
  if (message) item.delete();
}
