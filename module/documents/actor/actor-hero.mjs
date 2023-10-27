import {DamageRollConfig} from "../../applications/chat/damage-roll-config.mjs";
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
    const arsenal = this.parent.arsenal;
    const item = (key in arsenal) ? arsenal[key] : arsenal.first;
    let rolls = await DamageRollConfig.create(item);
    if (!rolls) return null;
    rolls = Object.values(foundry.utils.expandObject(rolls)).filter(r => {
      return (r.active !== false) && (r.type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(r.value);
    });
    return new DamageRollCombined(rolls, this.parent.getRollData()).toMessage();
  }
}
