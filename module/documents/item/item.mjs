export default class ItemArtichron extends Item {
  /* ---------------------------------------- */
  /*                                          */
  /*                  GETTERS                 */
  /*                                          */
  /* ---------------------------------------- */

  /**
   * Getters to determine the type of arsenal an item is.
   * @type {boolean}
   */

  /**
   * Is this wielded in one hand?
   * @type {boolean}
   */
  get isOneHanded() {
    return this.system.isOneHanded ?? false;
  }

  /**
   * Is this wielded with two hands?
   * @type {boolean}
   */
  get isTwoHanded() {
    return this.system.isTwoHanded ?? false;
  }

  /**
   * Is this an arsenal item?
   * @type {boolean}
   */
  get isArsenal() {
    return (this.type === "spell") || (this.type === "weapon") || this.isShield;
  }

  /**
   * Is this a shield?
   * @type {boolean}
   */
  get isShield() {
    return this.system.isShield ?? false;
  }

  /**
   * Is this item equipped on the actor in one of the slots?
   * @type {boolean}
   */
  get isEquipped() {
    if (!this.isEmbedded) return false;
    if (this.isArsenal) return Object.values(this.actor.arsenal).includes(this);
    else if (this.type === "armor") return Object.values(this.actor.armor).includes(this);
    return false;
  }

  /**
   * Retrieve a token from this item's owning actor.
   * @type {TokenArtichron|null}
   */
  get token() {
    const actor = this.actor;
    if (!actor) return null;
    const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
    return token ?? null;
  }

  /**
   * Does this item have any valid template or targeting types?
   * @type {boolean}
   */
  get hasTemplate() {
    return this.system.hasTemplate ?? false;
  }

  /* ---------------------------------------- */
  /*                                          */
  /*            PREPARATION METHODS           */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  prepareData() {
    super.prepareData();
  }

  /* ---------------------------------------- */
  /*                                          */
  /*               UPDATE METHODS             */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    const allowed = await super._preUpdate(update, options, user);
    if (allowed === false) return false;
    if (this.isEquipped && ("value" in (update.system?.wield ?? {}))) {
      ui.notifications.warn("You cannot change the Wield state of an equipped item.");
      return false;
    }
  }

  /** @override */
  _onUpdate(update, options, user) {
    return super._onUpdate(update, options, user);
  }

  /* ---------------------------------------- */
  /*                                          */
  /*                ITEM METHODS              */
  /*                                          */
  /* ---------------------------------------- */

  /** @override */
  getRollData() {
    if (!this.actor) return null;
    const data = this.actor.getRollData();
    data.item = {...this.system};
    return data;
  }

  /**
   * Favorite this item on its actor.
   * @returns {Promise<ActorArtichron|null>}
   */
  async favorite() {
    if (!this.actor) return null;
    const favorites = this.actor.system.toObject().equipped.favorites;
    if (favorites.includes(this.id)) favorites.findSplice(i => i === this.id);
    else favorites.push(this.id);
    return this.actor.update({"system.equipped.favorites": favorites});
  }

  /**
   * Perform usage of this item.
   * @returns {Promise}
   */
  async use() {
    return this.system.use?.() ?? null;
  }

  /**
   * Pick targets within range of this item.
   * @param {object} [options]                        Additional options.
   * @returns {Promise<TokenDocumentArtichron[]>}     The token documents of those targeted.
   */
  async pickTarget(options = {}) {
    return this.system.pickTarget?.(options) ?? null;
  }

  /**
   * Prompt for placing templates using this item.
   * @param {object} config     Template configuration and placement data.
   * @returns {Promise<MeasuredTemplateArtichron[]>}
   */
  async placeTemplates(config) {
    return this.system.placeTemplates?.(config) ?? null;
  }
}
