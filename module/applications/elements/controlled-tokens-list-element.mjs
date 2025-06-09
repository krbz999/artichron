export default class ControlledTokensListElement extends HTMLElement {
  /**
   * Controlled tokens.
   * @type {Map<string, foundry.canvas.placeables.Token>}
   */
  static #controlled = new Map();

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static tagName = "controlled-tokens-list";

  /* -------------------------------------------------- */

  /**
   * Has first-time setup been done? This stored the hook id.
   * @type {number}
   */
  #connected = null;

  /* -------------------------------------------------- */

  /**
   * The parent chat message.
   * @type {foundry.documents.ChatMessage}
   */
  get message() {
    return game.messages.get(this.closest("[data-message-id]").dataset.messageId);
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  connectedCallback() {
    if (this.#connected) return;
    this.#connected = Hooks.on("controlToken", ControlledTokensListElement.#controlToken.bind(this));

    const damage = this.message.type === "damage";
    for (const token of artichron.utils.getTokenTargets(canvas.tokens?.controlled ?? [])) {
      this.insertAdjacentElement("beforeend", this.#createTargetElement(token, { damage }));
    }
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  disconnectedCallback() {
    Hooks.off("controlToken", this.#connected);
    this.#connected = null;
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * A hook event to create or tear down target elements when a token is controlled or released.
   * @this {ControlledTokensListElement}
   * @param {foundry.canvas.placeables.Token} token   The token that was controlled or released.
   * @param {boolean} controlled                      Was the token controlled?
   */
  static #controlToken(token, controlled) {
    const actor = token.actor;
    if (!actor) return;

    const existing = this.querySelector(`[data-actor-uuid="${actor.uuid}"]`);
    if (controlled) {
      if (existing) return;
      const element = this.#createTargetElement(token, { damage: this.message.type === "damage" });
      this.insertAdjacentElement("beforeend", element);
    } else {
      if (!existing) return;
      existing.remove();
    }
  }

  /* -------------------------------------------------- */

  /**
   * Helper method to generate the HTML element for a token target.
   * @param {foundry.canvas.placeables.Token} token   The token placeable. Guaranteed to not be orphaned.
   * @param {object} [options={}]                     Options to modify the injected html.
   * @param {boolean} [options.damage=false]          Show damage calculations?
   * @returns {HTMLElement}
   */
  #createTargetElement(token, { damage = false } = {}) {
    const actor = token.actor;
    const element = foundry.utils.parseHTML(`
      <div class="target-element" data-actor-uuid="${actor.uuid}">
        <img class="avatar" src="${actor.img}" alt="${actor.name}">
        <label class="title">${token.name}</label>
      </div>`);

    // If this is a damage roll, also show damage calculation.
    if (damage) {
      element.classList.add("damage");
      const delta = -this.message.system.calculateDamage(token.actor);
      const css = (delta < 0) ? "damage" : (delta > 0) ? "healing" : "";
      element.insertAdjacentHTML("beforeend", `<span class="damage-delta ${css}">${delta.signedString()}</span>`);
    }

    element.addEventListener("click",
      event => ControlledTokensListElement.#onTargetMouseDown.call(this, event, element));
    element.addEventListener("pointerover",
      event => ControlledTokensListElement.#onTargetHoverIn.call(this, event, element));
    element.addEventListener("pointerout",
      event => ControlledTokensListElement.#onTargetHoverOut.call(this, event, element));

    return element;
  }

  /* -------------------------------------------------- */

  /**
   * Helper method to retrieve a token from a target element.
   * @param {HTMLElement} element   The element with references to an actor.
   * @returns {foundry.canvas.placeables.Token|null}
   */
  #getToken(element) {
    const actor = fromUuidSync(element.closest("[data-actor-uuid]").dataset.actorUuid);
    if (!actor) return null;
    const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
    if (!token) return null;
    return token;
  }

  /* -------------------------------------------------- */

  /**
   * Handle click events on a target.
   * @this {ControlledTokensListElement}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #onTargetMouseDown(event, target) {
    event.stopPropagation();
    const token = this.#getToken(target);
    if (!token) return;

    if (token.controlled && event.shiftKey) token.release();
    else if (!token.controlled) token.control({ releaseOthers: !event.shiftKey });
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover events on a target.
   * @this {ControlledTokensListElement}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #onTargetHoverIn(event, target) {
    const token = this.#getToken(target);
    if (!token) return;
    if (!token.visible || token.document.isSecret) return;

    token._onHoverIn(event, { hoverOutOthers: true });
    ControlledTokensListElement.#controlled.set(token.actor.uuid, token);
  }

  /* -------------------------------------------------- */

  /**
   * Handle hover-out events on a target.
   * @this {ControlledTokensListElement}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #onTargetHoverOut(event, target) {
    const uuid = target.closest("[data-actor-uuid]").dataset.actorUuid;

    if (ControlledTokensListElement.#controlled.has(uuid)) {
      ControlledTokensListElement.#controlled.get(uuid)._onHoverOut(event);
    }
    ControlledTokensListElement.#controlled.delete(uuid);
  }
}
