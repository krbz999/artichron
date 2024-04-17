import {DefenseDiceModel} from "../fields/die.mjs";
import ArsenalData from "./item-arsenal.mjs";
import * as utils from "../../helpers/utils.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";

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

    if (!item.isEquipped) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    const [target] = await this.pickTarget({count: 1, allowPreTarget: true});
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
      "flags.artichron.actorUuid": actor.uuid,
      "flags.artichron.itemUuid": item.uuid
    });
  }
}
