import ArsenalData from "./item-arsenal.mjs";
import {SYSTEM} from "../../../helpers/config.mjs";
import {CostField} from "../fields/cost.mjs";

export default class SpellData extends ArsenalData {
  /** @override */
  static SUBTYPES = SYSTEM.SPELL_TYPES;

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      ...CostField()
    };
  }
}
