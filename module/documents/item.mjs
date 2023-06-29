export default class ItemArtichron extends Item {
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

  /**
   * @override
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /** @override */
  getRollData() {
    if (!this.actor) return null;
    const data = this.actor.getRollData();
    data.item = {...this.system};
    return data;
  }
}
