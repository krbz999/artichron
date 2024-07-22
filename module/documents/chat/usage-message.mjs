import ChatMessageSystemModel from "./system-model.mjs";

const {DocumentUUIDField} = foundry.data.fields;

export default class UsageMessageData extends ChatMessageSystemModel {
  /** @override */
  static defineSchema() {
    return {
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

    if (!this.item) return;
    const usage = foundry.utils.deepClone(this.parent.getFlag("artichron", "usage") ?? {});

    const buttons = [];

    if (usage.target) {
      const button = document.createElement("BUTTON");
      button.dataset.action = "target";
      button.textContent = "Pick Targets";
      buttons.push(button);
      button.addEventListener("click", event => this.item.pickTarget(usage.target));
    }

    if (usage.templates) {
      const button = document.createElement("BUTTON");
      button.dataset.action = "templates";
      button.textContent = "Place Templates";
      buttons.push(button);
      button.addEventListener("click", async (event) => {
        const templates = await this.item.placeTemplates(usage.templates);
        await Promise.all(templates.map(template => template.waitForShape()));
        for (const template of templates) {
          for (const token of template.object.containedTokens) {
            artichron.utils.addTarget(token);
          }
        }
      });
    }

    if (usage.effect) {
      const div = document.createElement("DIV");
      div.classList.add("flexrow");

      const button = document.createElement("BUTTON");
      div.insertAdjacentElement("beforeend", button);
      button.dataset.action = "effect";
      button.innerHTML = "<i class='fa-solid fa-expand'></i> Grant Effect";
      button.addEventListener("click", async (event) => {
        const effect = await fromUuid(usage.effect.uuid);
        const actors = new Set();
        for (const {actor} of canvas.tokens.controlled) if (actor) actors.add(actor);
        for (const actor of actors) artichron.utils.sockets.grantBuff(effect, actor);
      });

      const targetButton = document.createElement("BUTTON");
      div.insertAdjacentElement("beforeend", targetButton);
      targetButton.dataset.action = "effect";
      targetButton.innerHTML = "<i class='fa-solid fa-bullseye'></i> Grant Effect";
      targetButton.addEventListener("click", async (event) => {
        const effect = await fromUuid(usage.effect.uuid);
        const actors = new Set();
        for (const {actor} of game.user.targets) if (actor) actors.add(actor);
        for (const actor of actors) artichron.utils.sockets.grantBuff(effect, actor);
      });

      buttons.push(div);
    }

    if (usage.damage) {
      const button = document.createElement("BUTTON");
      button.dataset.action = "damage";
      button.textContent = "Roll Damage";
      buttons.push(button);
      usage.damage.ammo = this.item.actor.items.get(usage.ammo) ?? null;
      button.addEventListener("click", event => this.item.rollDamage(usage.damage));
    }

    // Append buttons.
    const content = html.querySelector(".message-content");
    content.innerHTML = "";
    if (buttons.length) {
      const fieldset = document.createElement("FIELDSET");
      fieldset.insertAdjacentHTML("beforeend", "<legend>Buttons</legend>");
      for (const button of buttons) {
        fieldset.insertAdjacentElement("beforeend", button);
      }
      content.insertAdjacentElement("beforeend", fieldset);
    }
  }
}
