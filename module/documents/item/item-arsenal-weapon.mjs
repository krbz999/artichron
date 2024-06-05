import ArsenalData from "./item-arsenal.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import WeaponUseDialog from "../../applications/item/weapon-use-dialog.mjs";
import MeasuredTemplateArtichron from "../template/template.mjs";

const {SchemaField, StringField} = foundry.data.fields;

export default class WeaponData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultIcon: "icons/svg/sword.svg"
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

    const configuration = await WeaponUseDialog.create(item);
    if (!configuration) return null;
    const {ammo, stamina} = configuration;
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
      return new DamageRoll(formulas.join("+"), rollData, {type: type});
    });

    if (stamina) actor.update({"system.pools.stamina.value": actor.system.pools.stamina.value - stamina});
    if (ammo) ammo.update({"system.quantity.value": ammo.system.quantity.value - 1});

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

    return this.toMessage({rolls, targets: Array.from(targets)});
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
