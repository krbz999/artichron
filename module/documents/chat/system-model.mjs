export default class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Make system-specific adjustments to the chat message when created by an item.
   * @param {HTMLElement} html      The default html.
   */
  async adjustHTML(html) {}
}
