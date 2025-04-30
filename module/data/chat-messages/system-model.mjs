export default class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  /** @type {import("../../_types").ChatMessageSubtypeMetadata} */
  static get metadata() {
    return {
      embedded: {},
      icon: "",
      type: "",
    };
  }

  /* -------------------------------------------------- */

  /**
   * Make system-specific adjustments to the chat message when created by an item.
   * @param {HTMLElement} html    The default html.
   */
  async adjustHTML(html) {
    html.classList.add("artichron", this.parent.type);
  }
}
