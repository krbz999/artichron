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
  get isShield() {
    return this.system.isShield ?? false;
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
}
