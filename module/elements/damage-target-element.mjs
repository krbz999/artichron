export default class DamageTargetElement extends HTMLElement {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "damage-target";

  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {object}
   */
  #damages = null;

  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {object}
   */
  get damages() {
    return this.#damages;
  }

  /* -------------------------------------------------- */

  /**
   * The chat message this element is created within.
   * @type {ChatMessage}
   */
  chatMessage = null;

  /* -------------------------------------------------- */

  /**
   * The actor that is the target of this element.
   * @type {ActorArtichron}
   */
  actor = null;

  /* -------------------------------------------------- */

  /**
   * Hook ids.
   * @type {Map<Record<string, Set<number>>}
   */
  hookIds = new Map();

  /* -------------------------------------------------- */

  /** @override */
  connectedCallback() {
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if (!this.chatMessage) return false;

    this.actor ??= fromUuidSync(this.dataset.actorUuid);
    if (!this.actor?.isOwner) {
      this.remove();
      return;
    }

    this._applyHooks();

    this.innerHTML = `
    <img src="${this.actor.img}" alt="">
    <label class="name">${this.actor.name}</label>
    <div class="damage"></div>`;

    this.#damages = this.chatMessage.rolls.reduce((acc, roll) => {
      acc[roll.type] ??= {value: 0};
      acc[roll.type].value += roll.total;
      return acc;
    }, {});

    this.setAttribute("style", `--damage-total: "${this.actor.calculateDamage(this.#damages)}"`);
  }

  /* -------------------------------------------------- */

  /** @override */
  disconnectedCallback() {
    for (const [id, hook] of this.hookIds) Hooks.off(hook, id);
  }

  /* -------------------------------------------------- */

  /** Apply all relevant hooks to keep the targets updated. */
  _applyHooks() {
    let id = Hooks.on("deleteActor", this._onActorDeleted.bind(this));
    this.hookIds.set(id, "deleteActor");
    id = Hooks.on("deleteToken", this._onTokenDeleted.bind(this));
    this.hookIds.set(id, "deleteToken");
    id = Hooks.on("updateActor", this._onActorUpdate.bind(this));
    this.hookIds.set(id, "updateActor");
  }

  /* -------------------------------------------------- */

  /** Hook event for actors being deleted. */
  _onActorDeleted(actor) {
    if (actor === this.actor) this.remove();
  }

  /* -------------------------------------------------- */

  /** Hook event for synthetic actors being removed. */
  _onTokenDeleted(token) {
    if (token.actor?.isToken && (token.actor === this.actor)) this.remove();
  }

  /* -------------------------------------------------- */

  /** Hook event for actors being updated. */
  _onActorUpdate(actor, change, options, userId) {
    if (actor !== this.actor) return;
    this.setAttribute("style", `--damage-total: "${this.actor.calculateDamage(this.#damages)}"`);
  }
}
