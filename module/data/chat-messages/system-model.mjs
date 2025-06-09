export default class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Render the HTML for the ChatMessage which should be added to the log
   * @param {object} [options]             Additional options passed to the Handlebars template.
   * @param {boolean} [options.canDelete]  Render a delete button. By default, this is true for GM users.
   * @param {boolean} [options.canClose]   Render a close button for dismissing chat card notifications.
   * @returns {Promise<HTMLElement>}
   */
  async adjustHTML(html) {
    html.classList.add("artichron", this.parent.type);
  }
}
