import ChatMessageArtichron from "../documents/chat-message.mjs";

export default class HealTargetElement extends HTMLElement {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "healing-target";

  /* -------------------------------------------------- */

  /**
   * Is this a targeted or controlled actor's element?
   * @type {boolean}
   */
  targeted = true;

  /* -------------------------------------------------- */

  /**
   * The total amount of healing.
   * @type {number}
   */
  get healing() {
    return this.chatMessage.system.healing;
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

    const token = this.actor.isToken ? this.actor.token : this.actor.getActiveTokens(false, true)[0];
    const img = token ? token.texture.src : this.actor.img;

    this.innerHTML = `
    <img class="avatar" src="${img}" alt="" data-actor-uuid="${this.actor.uuid}">
    <label class="name">${token ? token.name : this.actor.name}</label>
    <div class="healing"></div>`;

    ChatMessageArtichron.attachTokenListeners(this.querySelector(".avatar"));

    this.setAttribute("style", `--healing-total: "${this.healing}"`);
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
    if (!this.targeted) {
      id = Hooks.on("controlToken", this._onControlToken.bind(this));
      this.hookIds.set(id, "controlToken");
    }
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

  /** Hook event for token being selected or unselected. */
  _onControlToken(token, selected) {
    if ((token.actor === this.actor) && !selected) this.remove();
  }
}
