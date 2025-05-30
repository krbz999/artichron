import BaseDocumentMixin from "./base-document-mixin.mjs";

export default class ChatMessageArtichron extends BaseDocumentMixin(foundry.documents.ChatMessage) {
  /**
   * Static register of token hover events for elements that emulate these.
   * @type {Map<string, Token>}
   */
  static #pointerRegistry = new Map();

  /* -------------------------------------------------- */

  /**
   * Is this a damage message?
   * @type {boolean}
   */
  get isDamage() {
    return this.flags.artichron?.type === "damage";
  }

  /* -------------------------------------------------- */

  /**
   * Is this a healing message?
   * @type {boolean}
   */
  get isHealing() {
    return this.flags.artichron?.type === "healing";
  }

  /* -------------------------------------------------- */

  /**
   * Is this an effect message?
   * @type {boolean}
   */
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

  /** @inheritdoc */
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const element = await super.renderHTML({ canDelete, canClose, ...rest });

    // Add speaker element.
    const actor = ChatMessageArtichron.getSpeakerActor(this.speaker);
    const token = game.scenes.get(this.speaker.scene)?.tokens.get(this.speaker.token);
    const template = document.createElement("DIV");
    template.innerHTML = await foundry.applications.handlebars.renderTemplate(
      "systems/artichron/templates/chat/message-header.hbs",
      {
        img: token?.texture.src ?? actor?.img ?? this.author?.avatar,
        actorUuid: actor?.uuid,
        name: actor?.name || this.speaker.alias,
      });
    element.querySelector(".message-sender").replaceWith(template.firstElementChild);
    const avatar = element.querySelector(".avatar");
    ChatMessageArtichron.attachTokenListeners(avatar);

    // Inject template from message type. TODO: Adjust for v13's `system.renderHTML`.
    if (this.system.adjustHTML) await this.system.adjustHTML(element);

    return element;
  }

  /* -------------------------------------------------- */

  /**
   * Utility method to attach token pointer and hover events to an element.
   * The element must have the `data-actor-uuid` attribute.
   * @param {HTMLElement} element   The element with the pointer events.
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
   * @param {PointerEvent} event    The initiating click event.
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
   * @param {PointerEvent} event    The initiating hover event.
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
   * @param {PointerEvent} event    The initiating hover event.
   */
  static #onTargetHoverOut(event) {
    const uuid = event.currentTarget.dataset.actorUuid;
    if (ChatMessageArtichron.#pointerRegistry.get(uuid)) {
      ChatMessageArtichron.#pointerRegistry.get(uuid)._onHoverOut(event);
    }
    ChatMessageArtichron.#pointerRegistry.delete(uuid);
  }
}
