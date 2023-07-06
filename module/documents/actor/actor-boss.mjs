import {BaseActorModel} from "./_actor-base.mjs";

export default class BossData extends BaseActorModel {
  static ARMS = 4;

  static defineSchema() {
    return super.defineSchema();
  }

  /* ---------------------------------------- */

  /** Ensure the arsenal worn is valid. */
  _validateArsenal(update) {
    const arsenal = foundry.utils.getProperty(update, "system.equipped.arsenal");
    if (!arsenal) return;
    if (this.parent.items.get(arsenal.primary)?.isTwoHanded) foundry.utils.setProperty(update, "system.equipped.arsenal.secondary", null);
    if (this.parent.items.get(arsenal.secondary)?.isTwoHanded) foundry.utils.setProperty(update, "system.equipped.arsenal.tertiary", null);
    if (this.parent.items.get(arsenal.tertiary)?.isTwoHanded) foundry.utils.setProperty(update, "system.equipped.arsenal.quaternary", null);
  }
}
