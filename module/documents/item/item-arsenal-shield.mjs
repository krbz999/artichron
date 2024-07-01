import ArsenalData from "./item-arsenal.mjs";
import {FormulaField} from "../fields/formula-field.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "shield"
  }, {inplace: false}));

  /* -------------------------------------------------- */

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
          required: true,
          initial: "buckler",
          label: "ARTICHRON.ItemProperty.Category.SubtypeShield",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeShieldHint",
          choices: CONFIG.SYSTEM.SHIELD_TYPES
        })
      }),
      cost: new SchemaField({
        value: new NumberField({
          min: 0,
          initial: 1,
          nullable: false,
          label: "ARTICHRON.ItemProperty.Cost.Value",
          hint: "ARTICHRON.ItemProperty.Cost.ValueHintShield"
        })
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  static get BONUS_FIELDS() {
    return super.BONUS_FIELDS.union(new Set([
      "system.armor.value"
    ]));
  }

  /* -------------------------------------------------- */

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

    if (!this.canUsePips) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
      return null;
    }

    this._targeting = true;
    const targets = await this.pickTarget({count: 1, allowPreTarget: true});
    delete this._targeting;

    const rolls = await this.rollDamage({multiply: 0.5}, {create: false});

    if (actor.inCombat) {
      await actor.spendActionPoints(item.system.cost.value);
    }

    return this.toMessage({rolls: rolls, targets: Array.from(targets.map(t => t.actor.uuid))});
  }
}
