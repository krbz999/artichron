import ArsenalData from "./item-arsenal.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";

export default class WeaponData extends ArsenalData {
  async use() {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

    if (this._targeting) return null; // Prevent initiating targeting twice.
    const item = this.parent;
    const actor = item.actor;

    if (!item.isEquipped) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    this._targeting = true;
    const [target] = await this.pickTarget({count: 1, allowPreTarget: true});
    delete this._targeting;
    if (!target) return null;

    const rollData = item.getRollData();
    const rolls = Object.entries(item.system.damage.reduce((acc, d) => {
      const isValid = d.formula && (d.type in CONFIG.SYSTEM.DAMAGE_TYPES) && Roll.validate(d.formula);
      if (!isValid) return acc;
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      return new DamageRoll(formulas.join("+"), rollData, {type: type});
    });

    return DamageRoll.toMessage(rolls, {
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "flags.artichron.targets": [target.uuid],
      "system.actor": actor.uuid,
      "system.item": item.uuid,
      type: "damage"
    });
  }
}
