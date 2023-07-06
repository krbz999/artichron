export default class ItemArtichron extends Item {
  /** ----------------------------------------
   *                  GETTERS
   *  ---------------------------------------- */

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

  /** ----------------------------------------
   *        DATA PREPARATION METHODS
   *  ---------------------------------------- */

  /**
   * @override
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /** ----------------------------------------
   *                UPDATE METHODS
   *  ---------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    await super._preUpdate(update, options, user);
  }

  /** @override */
  _onUpdate(update, options, user) {
    super._onUpdate(update, options, user);
  }

  /** ----------------------------------------
   *                ITEM METHODS
   *  ---------------------------------------- */

  /** @override */
  getRollData() {
    if (!this.actor) return null;
    const data = this.actor.getRollData();
    data.item = {...this.system};
    return data;
  }

  /**
   *
   */
  _getDamageRolls(){
    const dmg = this.system.damage;
    const parts = {};
    for(const d of dmg){
      if(!d.type || !d.value) continue;
      parts[d.type] ??= [];
      parts[d.type].push(d.value);
    }
    for(const p in parts) parts[p] = parts[p].join(" + ");
    return parts;
  }
}
