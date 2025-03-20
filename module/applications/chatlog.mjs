import ItemArtichron from "../documents/item.mjs";

export default class ChatLogArtichron extends foundry.applications.sidebar.tabs.ChatLog {
  _attachLogListeners(element, options) {
    super._attachLogListeners(element, options);
    element.addEventListener("drop", ChatLogArtichron._onDropItem);
  }

  /* -------------------------------------------------- */

  /**
  * Request to perform a trade from the owner of an item and to an actor in the primary party.
  * @param {Event} event     Initiating drop event.
  */
  static async _onDropItem(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type !== "Item") return;

    /** @type {ItemArtichron} */
    const item = await fromUuid(data.uuid);
    if (!item || !item.isOwner || !item.isEmbedded) return;

    const party = game.settings.get("artichron", "primaryParty").actor;
    if (party?.type !== "party") {
      ui.notifications.warn("ARTICHRON.TradeDialog.Warning.NoParty", { localize: true });
      return;
    }

    const choices = {};
    for (const id of [party.id, ...party.system.members.keys()]) {
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

    const config = await foundry.applications.api.DialogV2.input({
      position: {
        width: 400,
        height: "auto",
      },
      window: {
        title: game.i18n.format("ARTICHRON.TradeDialog.title", { name: item.name }),
        icon: "fa-solid fa-arrows-turn-to-dots",
      },
      content: `<fieldset>${fields.join("")}</fieldset>`,
      ok: {
        label: "ARTICHRON.TradeDialog.button.label",
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
}
