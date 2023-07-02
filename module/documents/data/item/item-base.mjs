export class BaseItemModel extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    return {};
  }

  /* ---------------------------------------- */

  /** @override */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
  }

  get isOneHanded(){
    return this.system.isOneHanded ?? false;
  }
  get isTwoHanded(){
    return this.system.isTwoHanded ?? false;
  }
}
