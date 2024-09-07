import ChatMessageSystemModel from "./system-model.mjs";

const {DocumentUUIDField, StringField} = foundry.data.fields;

export default class UsageMessageData extends ChatMessageSystemModel {
  /**
   * Metadata for this data model.
   * @type {import("../../helpers/types.mjs").ChatMessageSystemModelMetadata}
   */
  static metadata = Object.freeze({
    type: "usage"
  });

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      activity: new StringField(),
      item: new DocumentUUIDField({type: "Item", embedded: true})
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  prepareDerivedData() {
    try {
      const item = this.item.startsWith("Compendium") ? null : fromUuidSync(this.item);
      this.item = item ? item : null;
    } catch (err) {
      this.item = null;
    }
  }

  /* -------------------------------------------------- */

  /** @override */
  async adjustHTML(html) {
    await super.adjustHTML(html);

    const content = html.querySelector(".message-content");
    content.innerHTML = "";

    const fieldset = await this.#createActivityButtons();
    if (fieldset) content.insertAdjacentElement("beforeend", fieldset);
  }

  /* -------------------------------------------------- */

  /**
   * Create the buttons for the activity's actions.
   * @returns {Promise<HTMLElement|void>}
   */
  async #createActivityButtons() {
    if (!this.item?.isOwner) return;
    const activity = this.item.system.activities.get(this.activity);
    const buttons = [];

    for (const {action, label} of activity?.chatButtons ?? []) {
      const button = document.createElement("BUTTON");
      button.dataset.action = action;
      button.textContent = label;
      buttons.push(button);
      button.addEventListener("click", event => {
        const activity = this.item.system.activities.get(this.activity);
        const config = this.parent.getFlag("artichron", "usage") ?? {};
        switch (event.currentTarget.dataset.action) {
          case "cost":
            return activity.consumeCost();
          case "template":
            return activity.placeTemplate(config.area);
          case "damage":
            return activity.rollDamage(config.damage);
          case "healing":
            return activity.rollHealing();
          case "teleport":
            return activity.teleportToken(config.distance);
          case "effect":
            return activity.grantEffects();
        }
      });
    }

    // Append buttons.
    if (buttons.length) {
      const container = document.createElement("DIV");
      container.classList.add("item-details");

      const itemHeader = document.createElement("DIV");
      itemHeader.classList.add("item-header");
      const enriched = await TextEditor.enrichHTML(activity.description, {
        rollData: this.item.getRollData(), relativeTo: this.item
      });
      itemHeader.innerHTML = `
      <img class="icon" src="${this.item.img}" alt="${this.item.name}">
      <div class="details">
        <span class="title">${this.item.name}</span>
        <span class="subtitle">${activity.name}</span>
      </div>
      ${enriched ? `<div class="description">${enriched}</div>` : ""}`;
      container.insertAdjacentElement("beforeend", itemHeader);

      const buttonContainer = document.createElement("DIV");
      buttonContainer.classList.add("item-actions");
      for (const button of buttons) buttonContainer.insertAdjacentElement("beforeend", button);
      container.insertAdjacentElement("beforeend", buttonContainer);

      return container;
    }
  }
}
