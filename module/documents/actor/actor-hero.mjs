import {DamageRollCombined} from "../../dice/damage-roll.mjs";
import {ActorSystemModel} from "./system-model.mjs";

export default class HeroData extends ActorSystemModel {
  /** @override */
  static defineSchema() {
    return super.defineSchema();
  }

  /** @override */
  async _preUpdate(update, options, user) {
    return super._preUpdate(update, options, user);
  }

  /** @override */
  async rollDamage(key = null) {
    const arsenal = this.arsenal;
    const item = (key in arsenal) ? arsenal[key] : arsenal.first;
    return new DamageRollCombined(item.system.damage, this.parent.getRollData()).toMessage();
  }
}
