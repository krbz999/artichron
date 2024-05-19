class TargetElement extends HTMLElement {
  /**
   * The disabled state of this element.
   * @type {boolean}
   */
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(bool) {
    const disabledUuids = this.chatMessage.disabledUuids ??= new Set();
    if (bool) {
      this.setAttribute("disabled", "");
      disabledUuids.add(this.actor.uuid);
    } else {
      this.removeAttribute("disabled");
      disabledUuids.delete(this.actor.uuid);
    }
  }

  /**
   * The chat message this element is created within.
   * @type {ChatMessage}
   */
  chatMessage = null;

  /**
   * The actor that is the target of this element.
   * @type {ActorArtichron}
   */
  actor = null;

  /**
   * Hook ids.
   * @type {Map<Record<string, Set<number>>}
   */
  hookIds = new Map();

  /** @override */
  connectedCallback() {
    const messageId = this.closest("[data-message-id]")?.dataset.messageId;
    this.chatMessage = game.messages.get(messageId);
    if (!this.chatMessage) return false;

    this.actor = fromUuidSync(this.dataset.actorUuid);
    if (!this.actor) {
      this.remove();
      return false;
    }

    this._applyHooks();

    this.innerHTML = `
    <div class="target">
      <img src="${this.actor.img}" alt="">
      <span class="name">${this.actor.name}</span>
    </div>`;

    if (this.chatMessage.disabledUuids?.has(this.actor.uuid) || !this.actor.isOwner) this.disabled = true;
    else this.addEventListener("click", this._onClick.bind(this));
  }

  /** @override */
  disconnectedCallback() {
    for (const [id, hook] of this.hookIds) Hooks.off(hook, id);
  }

  /** Apply all relevant hooks to keep the targets updated. */
  _applyHooks() {
    let id = Hooks.on("deleteActor", this._onActorDeleted.bind(this));
    this.hookIds.set(id, "deleteActor");
    id = Hooks.on("deleteToken", this._onTokenDeleted.bind(this));
    this.hookIds.set(id, "deleteToken");
  }

  /** Hook event for actors being deleted. */
  _onActorDeleted(actor) {
    if (actor === this.actor) this.remove();
  }

  /** Hook event for synthetic actors being removed. */
  _onTokenDeleted(token) {
    if (token.actor?.isToken && (token.actor === this.actor)) this.remove();
  }

  /**
   * The click event for any targets.
   * @param {Event} event     Initiating click event.
   */
  _onClick(event) {}
}

export class DamageTarget extends TargetElement {
  /** @override */
  _applyHooks() {
    super._applyHooks();
    const id = Hooks.on("updateActor", this._onActorTakesDamage.bind(this));
    this.hookIds.set(id, "updateActor");
  }

  /** Hook event for actors being damaged. */
  _onActorTakesDamage(actor, change, options, userId) {
    if ((options.messageId === this.chatMessage.id) && (actor === this.actor)) this.disabled = true;
  }

  /** @override */
  _onClick(event) {
    if (this.disabled) return;
    const totals = this.chatMessage.flags.artichron.use.totals;
    this.actor.applyDamage(totals, {messageId: this.chatMessage.id});
  }
}

export class BuffTarget extends TargetElement {
  /** @override */
  _applyHooks() {
    super._applyHooks();
    const id = Hooks.on("createActiveEffect", this._onCreateBuff.bind(this));
    this.hookIds.set(id, "createActiveEffect");
  }

  /** Hook event for buffs being created. */
  _onCreateBuff(effect, options, userId) {
    if (options.messageId === this.chatMessage.id) this.disabled = true;
  }

  /** @override */
  _onClick(event) {
    if (this.disabled) return;
    const effect = fromUuidSync(this.chatMessage.flags.artichron.use.effectUuid);
    artichron.utils.sockets.grantBuff(effect, this.actor, {messageId: this.chatMessage.id});
  }
}
