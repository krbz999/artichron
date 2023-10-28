import {DamageRollConfig} from "../../applications/chat/damage-roll-config.mjs";
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
    const item = (key in arsenal) ? arsenal[key] : arsenal.first;
    const isFF = options.fastForward || options.event?.shiftKey;

    const rolls = isFF ? item.system.damage : await DamageRollConfig.create(item);
    if (!rolls?.length) return null;

    return DamageRollConfig.fromArray(rolls, item.getRollData()).toMessage({
      ...options,
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent})
    });
  }
}
