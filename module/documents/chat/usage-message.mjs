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

    const fieldset = this.#createActivityButtons();
    if (fieldset) content.insertAdjacentElement("beforeend", fieldset);
  }

  /* -------------------------------------------------- */

  /**
   * Create the buttons for the activity's actions.
   * @returns {HTMLElement|void}
   */
  #createActivityButtons() {
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
      const fieldset = document.createElement("FIELDSET");
      for (const button of buttons) fieldset.insertAdjacentElement("beforeend", button);
      return fieldset;
    }
  }
}
