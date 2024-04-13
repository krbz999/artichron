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
  get isOneHanded() {
    return this.system.isOneHanded ?? false;
  }
  get isTwoHanded() {
    return this.system.isTwoHanded ?? false;
  }
  get isMelee() {
    return this.system.isMelee ?? false;
  }
  get isRanged() {
    return this.system.isRanged ?? false;
  }
  get isSpell() {
    return this.type === "spell";
  }
  get isWeapon() {
    return this.type === "weapon";
  }
  get isArsenal() {
    return this.isSpell || this.isWeapon || this.isShield;
  }
  get isShield() {
    return this.system.isShield ?? false;
  }

  get token() {
    const actor = this.actor;
    if (!actor) return null;
    const [token] = actor.isToken ? [actor.token?.object] : actor.getActiveTokens();
    return token ?? null;
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
    return super._preUpdate(update, options, user);
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

  async use() {
    return this.system.use();
  }
}
