import ArsenalData from "./item-arsenal.mjs";
import MeasuredTemplateArtichron from "../object-classes/measured-template.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 2,
    order: 10,
    type: "weapon"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "ARTICHRON.ItemProperty.WeaponProperty"
  ];

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          choices: CONFIG.SYSTEM.WEAPON_TYPES,
          initial: () => Object.keys(CONFIG.SYSTEM.WEAPON_TYPES)[0]
        })
      }),
      cost: new SchemaField({
        value: new NumberField({min: 0, initial: 1, nullable: false})
      })
    };
  }

  /* -------------------------------------------------- */

  /** @override */
  async use() {
    if (!this.hasDamage) {
      ui.notifications.warn("ARTICHRON.Warning.ItemHasNoDamageRolls", {localize: true});
      return null;
    }

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

    const configuration = await artichron.applications.WeaponUseDialog.create(item);
    if (!configuration) return null;
    const stamina = configuration.stamina ?? 0;
    const ammo = actor.items.get(configuration.ammo) ?? null;
    const booster = actor.items.get(configuration.booster);
    const ammoModifiers = ammo ? ammo.system.ammoProperties : new Set();

    if (item.system.attributes.value.has("ammunition") && !ammo) {
      ui.notifications.warn("ARTICHRON.Warning.ItemRequiresAmmunition", {localize: true});
      return null;
    }

    const flags = {artichron: {usage: {}}};

    // Set up range properties.
    flags.artichron.usage.target = {
      range: this.parent.isMelee ?
        this.range.reach :
        Math.max(1, this.range.value + (ammoModifiers.has("range") ? ammo.system.range.value : 0)),
      count: 1,
      allowPreTarget: true
    };

    // Set up damage properties.
    flags.artichron.usage.damage = {
      ammo: ammo ? ammo.id : null,
      addition: stamina + (configuration.uses || 0)
    };

    const actorUpdate = {};
    const itemUpdates = [];
    if (stamina) actorUpdate["system.pools.stamina.value"] = actor.system.pools.stamina.value - stamina;
    if (ammo) itemUpdates.push({_id: ammo.id, "system.quantity.value": ammo.system.quantity.value - 1});
    if (booster) itemUpdates.push(booster.system._usageUpdate(configuration.uses || 0));

    await Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
    ]);

    if (actor.inCombat) {
      await actor.spendActionPoints(item.system.cost.value);
    }

    const messageData = {
      type: "usage",
      speaker: ChatMessage.implementation.getSpeaker({actor: actor}),
      "system.item": item.uuid,
      flags: flags
    };

    return ChatMessage.implementation.create(messageData);
  }

  /* -------------------------------------------------- */

  /**
   * Create a blast zone as product of some ammunition.
   * @param {TokenArtichron} origin                             The token of the attacker.
   * @param {TokenArtichron} target                             The token of the target.
   * @param {object} [options]                                  Template shape options.
   * @param {string} [options.type]                             The shape type of the blast zone.
   * @param {number} [options.size]                             The distance of the blast zone.
   * @returns {Promise<MeasuredTemplateDocumentArtichron>}      A promise that resolves to the created template.
   */
  static async createBlastZone(origin, target, {type = "ray", size = 1} = {}) {
    const ray = Ray.towardsPoint(origin.center, target.center, 1);
    const templateData = MeasuredTemplateArtichron.fromData({
      ...target.center,
      t: type,
      direction: Math.toDegrees(ray.angle),
      distance: size
    }).document.toObject();
    return getDocumentClass("MeasuredTemplate").create(templateData, {parent: canvas.scene});
  }

  /* -------------------------------------------------- */

  async createBlastZone(target, {type = "ray", size = 1} = {}) {
    const origin = this.parent.token;
    return this.constructor.createBlastZone(origin, target, {type, size});
  }

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
