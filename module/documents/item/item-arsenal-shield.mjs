import ArsenalData from "./item-arsenal.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import {FormulaField} from "../fields/formula-field.mjs";

const {SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultIcon: "icons/svg/shield.svg"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armor: new SchemaField({
        value: new FormulaField({
          required: true,
          label: "ARTICHRON.ItemProperty.Armor.Value",
          hint: "ARTICHRON.ItemProperty.Armor.ValueHint"
        })
      }),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeShield",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeShieldHint",
          choices: CONFIG.SYSTEM.SHIELD_TYPES
        })
      })
    };
  }

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value"
    ]));
  }

  /** @override */
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
    const rolls = Object.entries(item.system._damages.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      return new DamageRoll(formulas.join("+"), rollData, {type: type});
    });

    return this.toMessage({rolls: rolls, targets: [target.actor.uuid]});
  }
}
