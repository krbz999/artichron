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

    const {first, second} = actor.arsenal;
    const key = (first === item) ? "first" : (second === item) ? "second" : null;
    if (!key) {
      ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
      return null;
    }

    const token = this.parent.token;
    if (!token) {
      ui.notifications.warn("ARTICHRON.Warning.TokenMissing", {localize: true});
      return null;
    }

    const [target] = await utils.awaitTargets(1, {origin: token, range: item.system.wield.range || 1});
    if (!target) return null;

    const rollData = item.getRollData();
    const rolls = item.system.damage.map(d => new DamageRoll(d.formula, rollData, {type: d.type}));

    return DamageRoll.toMessage(rolls, {
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "flags.artichron.targets": [target.uuid],
      "flags.artichron.actorUuid": actor.uuid,
      "flags.artichron.itemUuid": item.uuid
    });
  }
}
