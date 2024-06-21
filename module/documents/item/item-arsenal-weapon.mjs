import ArsenalData from "./item-arsenal.mjs";
import WeaponUseDialog from "../../applications/item/weapon-use-dialog.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";

const {NumberField, SchemaField, StringField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultIcon: "icons/svg/sword.svg",
    type: "weapon"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new SchemaField({
        subtype: new StringField({
          label: "ARTICHRON.ItemProperty.Category.SubtypeWeapon",
          hint: "ARTICHRON.ItemProperty.Category.SubtypeWeaponHint",
          choices: CONFIG.SYSTEM.WEAPON_TYPES
        })
      }),
      cost: new SchemaField({
        value: new NumberField({
          min: 0,
          initial: 1,
          nullable: false,
          label: "ARTICHRON.ItemProperty.Cost.Value",
          hint: "ARTICHRON.ItemProperty.Cost.ValueHintWeapon"
        })
      })
    };
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

    if (!this.canUsePips) {
      ui.notifications.warn("ARTICHRON.Warning.MissingActionPoints", {localize: true});
      return null;
    }

    const configuration = await WeaponUseDialog.create(item);
    if (!configuration) return null;
    const stamina = configuration.stamina;
    const ammo = actor.items.get(configuration.ammo) ?? null;
    const booster = actor.items.get(configuration.booster);
    const ammoModifiers = ammo ? ammo.system.ammoProperties : new Set();

    // Ammo modifying range.
    const range = Math.max(1, this.range.value + (ammoModifiers.has("range") ? ammo.system.range.value : 0));

    this._targeting = true;
    const token = this.parent.token;
    const [target] = await this.pickTarget({origin: token, count: 1, allowPreTarget: true, range});
    delete this._targeting;
    if (!target) return null;

    // Construct roll data and damage parts.
    const rollData = item.getRollData();
    if (ammo) rollData.ammo = ammo.getRollData();
    const parts = foundry.utils.deepClone(item.system._damages);

    // Ammo modifying damage parts and damage types.
    if (ammoModifiers.has("damageOverride")) {
      const override = ammo.system.damage.override;
      for (const p of parts) {
        if ((override.group === "all") || (CONFIG.SYSTEM.DAMAGE_TYPES[p.type].group === override.group)) {
          p.type = override.value;
        }
      }
    }

    // Ammo adding additional damage parts.
    if (ammoModifiers.has("damageParts")) parts.push(...ammo.system._damages);

    const rolls = Object.entries(parts.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      const roll = new CONFIG.Dice.DamageRoll(formulas.join("+"), rollData, {type: type});
      roll.alter(1, stamina + (configuration.uses || 0));
      return roll;
    });

    const actorUpdate = {};
    const itemUpdates = [];
    if (stamina) actorUpdate["system.pools.stamina.value"] = actor.system.pools.stamina.value - stamina;
    if (ammo) itemUpdates.push({_id: ammo.id, "system.quantity.value": ammo.system.quantity.value - 1});
    if (booster) itemUpdates.push(booster.system._usageUpdate(configuration.uses || 0));

    await Promise.all([
      foundry.utils.isEmpty(actorUpdate) ? null : actor.update(actorUpdate),
      foundry.utils.isEmpty(itemUpdates) ? null : actor.updateEmbeddedDocuments("Item", itemUpdates)
    ]);

    // Create a template for the blast zone and modify targets.
    const targets = new Set([target.actor.uuid]);
    if (ammoModifiers.has("blast")) {
      const template = await this.constructor.createBlastZone(token, target.object, ammo.system.blast);
      await template.waitForShape();
      const additionalTargets = template.object.containedTokens;
      for (const t of additionalTargets) {
        if (t.actor) targets.add(t.actor.uuid);
      }
    }

    if (actor.inCombat) {
      await actor.spendActionPoints(item.system.cost.value);
    }

    return this.toMessage({rolls: rolls, targets: Array.from(targets)});
  }

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
  async createBlastZone(target, {type = "ray", size = 1} = {}) {
    const origin = this.parent.token;
    return this.constructor.createBlastZone(origin, target, {type, size});
  }
}
