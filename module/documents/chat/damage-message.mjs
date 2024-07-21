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
      const targeting = document.createElement("DIV");
      for (const target of targets) {
        const element = document.createElement("damage-target");
        element.actor = target;
        targeting.insertAdjacentElement("beforeend", element);
      }
      html.querySelector(".message-content").insertAdjacentElement("beforeend", targeting);
    }
  }
}
