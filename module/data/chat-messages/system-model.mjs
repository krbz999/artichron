export default class ChatMessageSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * Render the HTML for the ChatMessage which should be added to the log
   * @param {object} [options]             Additional options passed to the Handlebars template.
   * @param {boolean} [options.canDelete]  Render a delete button. By default, this is true for GM users.
   * @param {boolean} [options.canClose]   Render a close button for dismissing chat card notifications.
   * @returns {Promise<HTMLElement>}
   */
  async renderHTML(options = {}) {
    const template = "systems/artichron/templates/chat/chat-message.hbs";

    await foundry.applications.handlebars.loadTemplates([
      "systems/artichron/templates/chat/partials/header.hbs",
      "systems/artichron/templates/chat/partials/damage.hbs",
      "systems/artichron/templates/chat/partials/effect.hbs",
      "systems/artichron/templates/chat/partials/recovery.hbs",
      "systems/artichron/templates/chat/partials/healing.hbs",
      "systems/artichron/templates/chat/partials/teleport.hbs",
    ]);

    const context = {
      ...options,
      document: this.parent,
      actor: this.parent.speakerActor,
      user: game.user,
    };

    await this._prepareContext(context);

    const htmlString = await foundry.applications.handlebars.renderTemplate(template, context);
    const ul = foundry.utils.parseHTML(htmlString);
    const element = ul.firstElementChild;

    this._applyEventListeners(element);

    return element;
  }

  /* -------------------------------------------------- */

  /**
   * Prepare additional context for rendering.
   * @param {object} context    The current rendering context. **will be mutated**
   * @returns {Promise<void>}   A promise that resolves once the rendering context has been mutated.
   */
  async _prepareContext(context) {}

  /* -------------------------------------------------- */

  /**
   * Apply event listeners to the chat message.
   * @param {HTMLElement} element   The chat message element.
   */
  _applyEventListeners(element) {}

  /* -------------------------------------------------- */

  /**
   * Apply any additional configurations to a token target element.
   * @param {HTMLElement} element             The created token target element.
   * @param {foundry.documents.Actor} actor   The controlled or targeted token's actor.
   */
  _configureTokenElement(element, token) {}
}
