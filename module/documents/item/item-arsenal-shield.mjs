import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    type: "shield",
    defaultWeight: 2
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      armor: new SchemaField({
        value: new NumberField({min: 0, integer: true})
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

    if (game.user._targeting) return null; // Prevent initiating targeting twice.
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

    game.user._targeting = true;
    const targets = await this.pickTarget({count: 1, allowPreTarget: true});
    delete game.user._targeting;

    const rolls = await this.rollDamage({multiply: 0.5}, {create: false});

    if (actor.inCombat) {
      await actor.spendActionPoints(item.system.cost.value);
    }

    return this.toMessage({rolls: rolls, targets: Array.from(targets.map(t => t.actor.uuid))});
  }
}
