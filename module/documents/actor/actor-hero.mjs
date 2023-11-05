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

  /** @override (not really) */
  async rollDamage(key = null, options = {}) {
    const arsenal = this.parent.arsenal;
    let item = (key in arsenal) ? arsenal[key] : arsenal.first;
    if (!item) {
      ui.notifications.warn("ARTICHRON.NoItemInSlot", {localize: true});
      return null;
    }

    if (!item.system.damage.length) {
      ui.notifications.warn("ARTICHRON.NoDamageRollsInItem", {localize: true});
      return null;
    }

    const isFF = options.fastForward || options.event?.shiftKey;
    if (!isFF) {
      const configuration = await DamageRollConfig.create(item);
      if (!configuration) return null;
      item = item.clone({"system.damage": configuration}, {keepId: true});
      item.prepareData();
    }

    const rolls = item.system.damage.filter(dmg => {
      return (dmg.type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(dmg.value);
    });

    if (!rolls.length) {
      ui.notifications.warn("ARTICHRON.NoDamageRollsInItem", {localize: true});
      return null;
    }

    return new DamageRollCombined(rolls, item.getRollData()).toMessage({
      ...options,
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent})
    });
  }
}
