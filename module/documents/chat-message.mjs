export default class ChatMessageArtichron extends ChatMessage {
  /**
   * Reference to any currently highlighted token.
   * @type {TokenArtichron|null}
   */
  #highlighted = null;

  /* -------------------------------------------------- */

  /** @override */
  async getHTML(...T) {
    const html = await super.getHTML(...T);

    // Add speaker element.
    const actor = this.constructor.getSpeakerActor(this.speaker);
    const token = game.scenes.get(this.speaker.scene)?.tokens.get(this.speaker.token);
    const template = document.createElement("DIV");
    template.innerHTML = await renderTemplate("systems/artichron/templates/chat/message-header.hbs", {
      img: token?.texture.src ?? actor?.img ?? this.author?.avatar,
      name: actor?.name || this.speaker.alias
    });
    html[0].querySelector(".message-sender").replaceWith(template.firstElementChild);
    const avatar = html[0].querySelector(".avatar");
    avatar.addEventListener("click", this.#onTargetMouseDown.bind(this));
    avatar.addEventListener("pointerover", this.#onTargetHoverIn.bind(this));
    avatar.addEventListener("pointerout", this.#onTargetHoverOut.bind(this));

    // Inject template from message type.
    if (this.system.adjustHTML) await this.system.adjustHTML(html[0]);

    return html;
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on chat message avatar.
   * @param {PointerEvent} event      The originating click event.
   */
  #onTargetMouseDown(event) {
    event.stopPropagation();

    const actor = this.constructor.getSpeakerActor(this.speaker);
    if (!actor?.testUserPermission(game.user, "OBSERVER")) return;

    const token = actor.isToken ? actor.token?.object : actor.getActiveTokens()[0];
    if (!token) return;

    if (token.controlled && event.shiftKey) token.release();
    else if (!token.controlled) token.control({releaseOthers: !event.shiftKey});
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-in events on chat message avatar.
   * @param {PointerEvent} event      The originating hover event.
   */
  #onTargetHoverIn(event) {
    const actor = this.constructor.getSpeakerActor(this.speaker);
    const token = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];
    if (token && token.isVisible && !token.isSecret) {
      if (!token.controlled) token._onHoverIn(event, {hoverOutOthers: true});
      this.#highlighted = token;
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-out events on chat message avatar.
   * @param {PointerEvent} event      The originating hover event.
   */
  #onTargetHoverOut(event) {
    if (this.#highlighted) this.#highlighted._onHoverOut(event);
    this.#highlighted = null;
  }
}
