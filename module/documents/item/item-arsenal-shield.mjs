import ArsenalData from "./item-arsenal.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class ShieldData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    order: 20,
    type: "shield"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: "buckler",
          choices: CONFIG.SYSTEM.SHIELD_TYPES
        })
      }),
      cost: new SchemaField({
        value: new NumberField({min: 0, initial: 1, nullable: false})
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
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.ShieldProperty"
  ];

  /* -------------------------------------------------- */

  // /** @override */
  // async use() {
  //   if (!this.hasDamage) {
  //     ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
  //     return null;
  //   }

  //   const item = this.parent;
  //   const actor = item.actor;

  //   if (!item.isEquipped) {
  //     ui.notifications.warn("ARTICHRON.Warning.ItemIsNotEquipped", {localize: true});
  //     return null;
  //   }

  //   if (!this.canUsePips) {
  //     ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
  //     return null;
  //   }

  //   if (actor.inCombat) {
  //     await actor.spendActionPoints(item.system.cost.value);
  //   }

  //   const flags = {artichron: {usage: {
  //     damage: {multiply: 0.5, ids: []},
  //     target: {
  //       allowPreTarget: true,
  //       count: 1,
  //       range: this.range.reach
  //     }
  //   }}};

  //   const messageData = {
  //     type: "usage",
  //     speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
  //     "system.item": item.uuid,
  //     flags: flags
  //   };

  //   return ChatMessage.implementation.create(messageData);
  // }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();

    context.damages = this._damages.map(k => {
      return {
        formula: Roll.create(k.formula, context.rollData).formula,
        config: CONFIG.SYSTEM.DAMAGE_TYPES[k.type]
      };
    });

    return context;
  }
}
