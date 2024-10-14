import ChatMessageArtichron from "../documents/chat-message.mjs";

export default class TokenTargetElement extends HTMLElement {
  /* -------------------------------------------------- */
  /*   Properties                                       */
  /* -------------------------------------------------- */

  /**
   * The tag name of this element.
   * @type {string}
   */
  static tagName = "token-target";

  /* -------------------------------------------------- */

  /**
   * Is this a targeted or controlled actor's element?
   * @type {boolean}
   */
  targeted = true;

  /* -------------------------------------------------- */

  /**
   * The damage totals by type.
   * @type {object}
   */
  get damages() {
    return this.chatMessage.damages;
  }

  /* -------------------------------------------------- */

  /**
   * The total amount of healing.
   * @type {number}
   */
  get healing() {
    return this.chatMessage.rolls.reduce((acc, roll) => acc + roll.total, 0);
  }

  /* -------------------------------------------------- */

  /**
   * The effects to transfer.
   * @type {ActiveEffect[]}
   */
  get effects() {
    const item = this.chatMessage.system.item;
    const activity = item?.system.activities.get(this.chatMessage.system.activity);
    const ids = activity?.effects?.ids ?? [];
    const actor = item?.actor;
    return ids.map(id => actor.effects.get(id));
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
    if (!this.actor?.isOwner || !this.actor.system.health) {
      this.remove();
      return;
    }

    this._applyHooks();

    const isRoll = this.chatMessage.isRoll;
    const token = this.actor.isToken ? this.actor.token : this.actor.getActiveTokens(false, true)[0];
    const img = token ? token.texture.src : this.actor.img;

    this.innerHTML = `
    <img class="avatar" src="${img}" alt="" data-actor-uuid="${this.actor.uuid}">
    <label class="name">${token ? token.name : this.actor.name}</label>
    ${isRoll ? "<div class='damage'></div>" : ""}`;

    ChatMessageArtichron.attachTokenListeners(this.querySelector(".avatar"));

    if (isRoll) this._onActorUpdate(this.actor);
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

    if (this.chatMessage.isRoll) {
      id = Hooks.on("updateActor", this._onActorUpdate.bind(this));
      this.hookIds.set(id, "updateActor");
    }

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

  /** Hook event for actors being updated. */
  _onActorUpdate(actor) {
    if (actor !== this.actor) return;
    const type = this.dataset.type;
    const total = (type === "damage") ? this.actor.calculateDamage(this.damages) : this.healing;
    const color = (type === "damage") ? "red" : "green";
    this.setAttribute("style", `--damage-total: "${total}"; --color: ${color}`);
  }

  /* -------------------------------------------------- */

  /** Hook event for token being selected or unselected. */
  _onControlToken(token, selected) {
    if ((token.actor === this.actor) && !selected) this.remove();
  }

  /* -------------------------------------------------- */

  /**
   * Execute the application of this element.
   */
  async apply() {
    const {item, activity} = this.chatMessage.system;

    switch (this.dataset.type) {
      case "damage":
        return this.actor.applyDamage(this.damages);
      case "healing":
        return this.actor.applyHealing(this.healing);
      case "effect":
        return item.system.activities.get(activity).grantEffects([this.actor]);
      default: break;
    }
  }
}
