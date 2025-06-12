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
      const damage = this.message.type === "damage";
      this.insertAdjacentElement("beforeend", this.#createTargetElement(token, { damage }));
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
      const damaged = this.message.system.damaged.some(d => d.actorUuid === actor.uuid);
      if (damaged) {
        element.classList.add("damaged");
        const undoButton = foundry.utils.parseHTML("<a class='undo fa-solid fa-fw fa-recycle'></a>");
        undoButton.addEventListener("click",
          event => ControlledTokensListElement.#undoDamage.call(this, event, undoButton));
        element.insertAdjacentElement("beforeend", undoButton);
      } else {
        const delta = -this.message.system.calculateDamage(token.actor);
        const cssClass = [
          "damage-delta",
          (delta < 0) ? "damage" : (delta > 0) ? "healing" : "",
        ].filterJoin(" ");
        element.insertAdjacentHTML("beforeend", `<span class="${cssClass}">${Math.abs(delta)}</span>`);
      }
    }

    const avatar = element.querySelector(".avatar");
    avatar.addEventListener("click",
      event => ControlledTokensListElement.#onTargetMouseDown.call(this, event, avatar));
    avatar.addEventListener("pointerover",
      event => ControlledTokensListElement.#onTargetHoverIn.call(this, event, avatar));
    avatar.addEventListener("pointerout",
      event => ControlledTokensListElement.#onTargetHoverOut.call(this, event, avatar));

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
   * Handle undoing damage.
   * @this {ControlledTokensListElement}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLElement} target    The target element.
   */
  static #undoDamage(event, target) {
    const actor = fromUuidSync(target.closest("[data-actor-uuid]").dataset.actorUuid);
    const damaged = foundry.utils.deepClone(this.message.system._source.damaged);
    const amount = damaged.findSplice(d => d.actorUuid === actor.uuid).amount;
    actor.applyHealing(amount);
    this.message.update({ "system.damaged": damaged });
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
