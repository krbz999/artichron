import {DefenseDiceModel} from "../fields/die.mjs";
import ArsenalData from "./item-arsenal.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";

const {EmbeddedDataField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      parry: new EmbeddedDataField(DefenseDiceModel),
      block: new EmbeddedDataField(DefenseDiceModel)
    };
  }

  prepareDerivedData() {
    const rollData = super.prepareDerivedData();
    ["parry", "block"].forEach(v => this[v].prepareDerivedData(rollData));
  }

  /** @override */
  get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.parry.number", "system.parry.faces",
      "system.block.number", "system.block.faces"
    ]));
  }

  async use() {
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
