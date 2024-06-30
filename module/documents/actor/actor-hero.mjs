import {ActorSystemModel} from "./system-model.mjs";

export default class HeroData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    return super.defineSchema();
  }

  /* -------------------------------------------------- */

  /** @override */
  async _preUpdate(update, options, user) {
    return super._preUpdate(update, options, user);
  }
}
