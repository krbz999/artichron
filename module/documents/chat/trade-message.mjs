import ChatMessageSystemModel from "./system-model.mjs";
import ItemArtichron from "../item.mjs";

const { BooleanField, DocumentUUIDField, JSONField } = foundry.data.fields;

export default class TradeMessageData extends ChatMessageSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ChatMessageSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "trade",
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      itemData: new JSONField(),
      actor: new DocumentUUIDField({ type: "Actor" }),
      target: new DocumentUUIDField({ type: "Actor" }),
      traded: new BooleanField(),
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
    return new Cls(this.itemData, { parent: this.actor });
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
      canCancel: !!this.actor?.isOwner && !!this.parent.isAuthor,
    });

    html.querySelector("[data-action=acceptTrade]")?.addEventListener("click", this.#onAcceptTrade.bind(this));
    html.querySelector("[data-action=cancelTrade]")?.addEventListener("click", this.#onCancelTrade.bind(this));
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on the Accept Trade button.
   * @param {PointerEvent} event     Initiating click event.
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
   * @param {PointerEvent} event      Initiating click event.
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

/* -------------------------------------------------- */

Hooks.once("renderChatLog", (app, [html]) => {
  const log = html.querySelector("#chat-log");
  log.addEventListener("drop", _onDropItem);
});

/* -------------------------------------------------- */

/**
 * Request to perform a trade from the owner of an item and to an actor in the primary party.
 * @param {Event} event     Initiating drop event.
 */
async function _onDropItem(event) {
  const data = TextEditor.getDragEventData(event);
  if (data.type !== "Item") return;

  /**
   * @type {ItemArtichron}
   */
  const item = await fromUuid(data.uuid);
  if (!item || !item.isOwner || !item.isEmbedded) return;

  const party = game.settings.get("artichron", "primaryParty").actor;
  if (party?.type !== "party") {
    ui.notifications.warn("ARTICHRON.TradeDialog.Warning.NoParty", { localize: true });
    return;
  }

  const choices = {};
  for (const id of [party.id, ...party.system.members.ids]) {
    if (id === item.actor.id) continue;
    choices[id] = game.actors.get(id).name;
  }
  const fields = [new foundry.data.fields.StringField({
    required: true,
    choices: choices,
    label: "ARTICHRON.TradeDialog.actorId.label",
    hint: "ARTICHRON.TradeDialog.actorId.hint",
  }).toFormGroup({ localize: true }, { name: "actorId" }).outerHTML];

  if (item.system.schema.has("quantity")) {
    if (!item.system.quantity.value) {
      ui.notifications.warn("ARTICHRON.TradeDialog.Warning.NoQuantity", { localize: true });
      return;
    }

    fields.push(new foundry.data.fields.NumberField({
      min: 1,
      max: item.system.quantity.value,
      integer: true,
      nullable: false,
      label: "ARTICHRON.TradeDialog.quantity.label",
      hint: "ARTICHRON.TradeDialog.quantity.hint",
    }).toFormGroup({ localize: true }, { value: item.system.quantity.value, name: "quantity" }).outerHTML);
  }

  const config = await foundry.applications.api.DialogV2.prompt({
    position: {
      width: 400,
      height: "auto",
    },
    window: {
      title: game.i18n.format("ARTICHRON.TradeDialog.title", { name: item.name }),
      icon: "fa-solid fa-arrows-turn-to-dots",
    },
    content: `<fieldset>${fields.join("")}</fieldset>`,
    rejectClose: false,
    ok: {
      label: "ARTICHRON.TradeDialog.button.label",
      callback: (event, button) => new FormDataExtended(button.form).object,
    },
  });
  if (!config) return;

  const itemData = game.items.fromCompendium(item, { keepId: true });
  if (config.quantity) itemData.system.quantity.value = config.quantity;

  const message = await ChatMessage.implementation.create({
    type: "trade",
    system: {
      traded: false,
      itemData: itemData,
      target: game.actors.get(config.actorId).uuid,
      actor: item.actor.uuid,
    },
  });
  if (message) {
    const del = !config.quantity || (item.system.quantity.value === config.quantity);
    if (del) item.delete();
    else item.update({ "system.quantity.value": item.system.quantity.value - config.quantity });
  }
}
