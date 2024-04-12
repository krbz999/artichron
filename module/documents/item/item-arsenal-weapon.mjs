import {DefenseDiceModel} from "../fields/die.mjs";
import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, EmbeddedDataField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      parry: new EmbeddedDataField(DefenseDiceModel),
      block: new EmbeddedDataField(DefenseDiceModel),
      armor: new SchemaField({
        value: new NumberField({integer: true, min: 0})
      })
    };
  }

  prepareDerivedData() {
    const rollData = super.prepareDerivedData();
    ["parry", "block"].forEach(v => this[v].prepareDerivedData(rollData));
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "parry.number", "parry.faces",
      "block.number", "block.faces",
      "armor.value"
    ]));
  }

  async use() {
    const item = this.parent;
    const actor = item.actor;

    const {first, second} = actor.arsenal;
    const key = (first === item) ? "first" : (second === item) ? "second" : null;
    if (!key) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    const inCombat = actor.inCombat;
    if (inCombat) {
      const combatant = game.combat.getCombatantByActor(actor);
      const pips = combatant.pips;
      const cost = this.isOneHanded ? 1 : this.isTwoHanded ? 2 : 0;
      if (cost > pips) {
        ui.notifications.warn("ARTICHRON.Warning.NotEnoughPips", {localize: true});
        return null;
      }

      await combatant.setFlag("artichron", "pips", pips - cost);
    }

    return actor.rollDamage(key);
  }
}
