import ChatMessageSystemModel from "./system-model.mjs";

const {ArrayField, DocumentUUIDField, StringField} = foundry.data.fields;

export default class DamageMessageData extends ChatMessageSystemModel {
  /** @override */
  static defineSchema() {
    return {
      item: new DocumentUUIDField({type: "Item", embedded: true}),
      targets: new ArrayField(new StringField())
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

    if (!this.item) return;

    const promises = this.targets.map(uuid => fromUuid(uuid));
    const actors = await Promise.all(promises);
    const targets = actors.reduce((acc, actor) => {
      if (actor) acc.add(actor);
      return acc;
    }, new Set());

    if (targets.size) {
      // outer wrapper
      const targeting = document.createElement("DIV");
      targeting.classList.add("wrapper", "expanded");

      // Click Me label
      const header = document.createElement("HEADER");
      header.classList.add("toggle");
      header.textContent = "Click Me!";
      header.addEventListener("click", event => targeting.classList.toggle("expanded"));
      targeting.insertAdjacentElement("beforeend", header);

      // inner wrapper
      const collapsible = document.createElement("DIV");
      collapsible.classList.add("targets");
      targeting.insertAdjacentElement("beforeend", collapsible);
      for (const target of targets) {
        const element = document.createElement("damage-target");
        element.actor = target;
        collapsible.insertAdjacentElement("beforeend", element);
      }

      // apply button
      const button = document.createElement("BUTTON");
      button.textContent = "Apply Damage";
      button.addEventListener("click", event => {
        for (const element of button.closest(".wrapper").querySelectorAll("damage-target")) {
          element.actor.applyDamage(element.damages);
        }
        targeting.classList.toggle("expanded", false);
      });
      collapsible.insertAdjacentElement("beforeend", button);

      html.querySelector(".message-content").insertAdjacentElement("beforeend", targeting);
    }
  }
}
