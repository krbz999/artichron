import {DamageRollConfig} from "../../applications/chat/damage-roll-config.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
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
    const update = {};

    const item = (key in arsenal) ? arsenal[key] : arsenal.first;
    if (!item) {
      ui.notifications.warn("ARTICHRON.NoItemInSlot", {localize: true});
      return null;
    }

    if (!item.system.damage.length) {
      ui.notifications.warn("ARTICHRON.NoDamageRollsInItem", {localize: true});
      return null;
    }

    let scale = 0;
    const isFF = options.fastForward || options.event?.shiftKey;
    if (!isFF) {
      const configuration = await DamageRollConfig.create(item);
      if (!configuration) return null;
      console.warn(configuration);
      ["mana", "stamina", "health"].forEach(k => {
        if (k in configuration) {
          const pool = this.pools[k];
          update[`system.pools.${k}.value`] = Math.clamped(pool.value - configuration[k], 0, pool.max);
          scale += configuration[k];
          delete configuration[k];
        }
      });
    }

    const rollData = item.getRollData();

    const rolls = item.system.damage.reduce((acc, dmg) => {
      if ((dmg.type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(dmg.formula)) {
        acc.push(new DamageRoll(dmg.formula, rollData, {type: dmg.type}));
      }
      return acc;
    }, []);

    if (!rolls.length) {
      ui.notifications.warn("ARTICHRON.NoDamageRollsInItem", {localize: true});
      return null;
    }

    if (!foundry.utils.isEmpty(update)) await this.parent.update(update);

    if (scale) for(const roll of rolls) roll.alter(1, scale);

    return DamageRoll.toMessage(rolls, {
      ...options,
      speaker: ChatMessage.implementation.getSpeaker({actor: this.parent})
    });
  }
}
