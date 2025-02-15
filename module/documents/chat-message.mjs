export default class ChatMessageArtichron extends ChatMessage {
  /**
   * Static register of token hover events for elements that emulate these.
   * @type {Map<string, Token>}
   */
  static #pointerRegistry = new Map();

  /* -------------------------------------------------- */

  get isDamage() {
    return this.flags.artichron?.type === "damage";
  }

  get isHealing() {
    return this.flags.artichron?.type === "healing";
  }

  get isEffect() {
    return this.flags.artichron?.type === "effect";
  }

  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {import("./actor.mjs").DamageDescription[]}
   */
  get damages() {
    const item = this.system.item;
    const statuses = item ? item.attributes : {};
    return this.rolls.map(roll => {
      return {
        type: roll.type,
        value: roll.total,
        statuses: statuses,
        options: roll.damageOptions,
      };
    });
  }

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
      actorUuid: actor?.uuid,
      name: actor?.name || this.speaker.alias,
    });
    html[0].querySelector(".message-sender").replaceWith(template.firstElementChild);
    const avatar = html[0].querySelector(".avatar");
    ChatMessageArtichron.attachTokenListeners(avatar);

    // Inject template from message type.
    if (this.system.adjustHTML) await this.system.adjustHTML(html[0]);

    return html;
  }

  /* -------------------------------------------------- */

  /**
   * Utility method to attach token pointer and hover events to an element.
   * The element must have the `data-actor-uuid` attribute.
   * @param {HTMLElement} element     The element with the pointer events.
   */
  static attachTokenListeners(element) {
    element.addEventListener("click", this.#onTargetMouseDown.bind(element));
    element.addEventListener("pointerover", this.#onTargetHoverIn.bind(element));
    element.addEventListener("pointerout", this.#onTargetHoverOut.bind(element));
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on chat message avatar.
   * @this {HTMLElement}
   * @param {PointerEvent} event      The originating click event.
   */
  static #onTargetMouseDown(event) {
    event.stopPropagation();

    const actor = fromUuidSync(event.currentTarget.dataset.actorUuid);
    if (!actor?.testUserPermission(game.user, "OBSERVER")) return;

    const token = actor.isToken ? actor.token?.object : actor.getActiveTokens()[0];
    if (!token) return;

    if (token.controlled && event.shiftKey) token.release();
    else if (!token.controlled) token.control({ releaseOthers: !event.shiftKey });
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-in events on chat message avatar.
   * @this {HTMLElement}
   * @param {PointerEvent} event      The originating hover event.
   */
  static #onTargetHoverIn(event) {
    const actor = fromUuidSync(event.currentTarget.dataset.actorUuid);
    const token = actor?.isToken ? actor.token?.object : actor?.getActiveTokens()[0];
    if (token && token.isVisible && !token.isSecret) {
      if (!token.controlled) token._onHoverIn(event, { hoverOutOthers: true });
      ChatMessageArtichron.#pointerRegistry.set(event.currentTarget.dataset.actorUuid, token);
    }
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-out events on chat message avatar.
   * @this {HTMLElement}
   * @param {PointerEvent} event      The originating hover event.
   */
  static #onTargetHoverOut(event) {
    const uuid = event.currentTarget.dataset.actorUuid;
    if (ChatMessageArtichron.#pointerRegistry.get(uuid)) {
      ChatMessageArtichron.#pointerRegistry.get(uuid)._onHoverOut(event);
    }
    ChatMessageArtichron.#pointerRegistry.delete(uuid);
  }
}
