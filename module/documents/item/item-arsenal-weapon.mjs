import ArsenalData from "./item-arsenal.mjs";
import {DamageRoll} from "../../dice/damage-roll.mjs";
import {CategoryField} from "../fields/category-field.mjs";
import WeaponUseDialog from "../../applications/item/weapon-use-dialog.mjs";

export default class WeaponData extends ArsenalData {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultIcon: "icons/svg/sword.svg"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new CategoryField({
        label: "ARTICHRON.ItemProperty.WeaponType",
        choices: CONFIG.SYSTEM.WEAPON_TYPES
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

    this._targeting = true;
    const [target] = await this.pickTarget({count: 1, allowPreTarget: true});
    delete this._targeting;
    if (!target) return null;

    const rollData = item.getRollData();
    const parts = item.system._damages;
    const rolls = Object.entries(parts.reduce((acc, d) => {
      acc[d.type] ??= [];
      acc[d.type].push(d.formula);
      return acc;
    }, {})).map(([type, formulas]) => {
      return new DamageRoll(formulas.join("+"), rollData, {type: type});
    });

    if (stamina) actor.update({"system.pools.stamina.value": actor.system.pools.stamina.value - stamina});
    if (ammo) ammo.update({"system.quantity.value": ammo.system.quantity.value - 1});

    return DamageRoll.toMessage(rolls, {"flags.artichron.use.targetUuids": [target.actor.uuid]}, {item: item});
  }
}
