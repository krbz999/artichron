import {SYSTEM} from "../../../helpers/config.mjs";
import ArsenalData from "./item-arsenal.mjs";

export default class ShieldData extends ArsenalData {
  /** @override */
  static SUBTYPES = SYSTEM.SHIELD_TYPES;

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
