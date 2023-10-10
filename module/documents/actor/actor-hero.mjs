import {DamageRollCombined} from "../../dice/damage-roll.mjs";
import {BaseActorModel} from "./_actor-base.mjs";

export default class HeroData extends BaseActorModel {
  static defineSchema() {
    return super.defineSchema();
  }

  getRollData({deterministic = false} = {}) {
    return this.parent.getRollData({deterministic});
  }

  /* ---------------------------------------- */

  /** Ensure the arsenal worn is valid. */
  _validateArsenal(update) {
    const arsenal = foundry.utils.getProperty(update, "system.equipped.arsenal");
    if (!arsenal) return;
    if (this.parent.items.get(arsenal.primary)?.isTwoHanded) foundry.utils.setProperty(update, "system.equipped.arsenal.secondary", null);
  }

  /**
   * Get equipped and valid weaponry.
   * @type {Set<ItemArtichron>}
   */
  get arsenal() {
    const max = this.constructor.ARMS;
    const set = new Set();
    for (const id of this.equipped.arsenal) {
      const item = this.parent.items.get(id);
      const hands = item?.isTwoHanded ? 2 : 1;
      if (item && ((hands + set.size) < max)) {
        set.add(item);
      }
    }
    return set;
  }

  async rollDamage(id = null) {
    const arsenal = this.arsenal;
    const item = id ? arsenal.find(a => a.id === id) : arsenal.first();
    console.warn({arsenal, item, id});
    return new DamageRollCombined(item.system.damage, this.getRollData()).toMessage();
  }
}
