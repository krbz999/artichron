import {BaseActorModel} from "./actor-base.mjs";

export default class MerchantData extends BaseActorModel {
  static defineSchema() {
    return super.defineSchema();
  }

  /* ---------------------------------------- */

  /** Ensure the arsenal worn is valid. */
  _validateArsenal(update) {
    const arsenal = foundry.utils.getProperty(update, "system.equipped.arsenal");
    if (!arsenal) return;
    if (this.parent.items.get(arsenal.primary)?.isTwoHanded) foundry.utils.setProperty(update, "system.equipped.arsenal.secondary", null);
  }
}
