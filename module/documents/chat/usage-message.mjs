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
    await this._insertItemHeader(html);
  }
}
