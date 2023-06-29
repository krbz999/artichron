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
}
