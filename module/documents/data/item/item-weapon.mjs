import {SYSTEM} from "../../../helpers/config.mjs";
import ArsenalData from "./item-arsenal.mjs";

export default class WeaponData extends ArsenalData {
  /** @override */
  static SUBTYPES = SYSTEM.WEAPON_TYPES;

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
