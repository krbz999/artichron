import {SYSTEM} from "../../helpers/config.mjs";
import ArsenalData from "./_item-arsenal.mjs";

export default class ShieldData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.StringField({
        options: SYSTEM.SHIELD_TYPES,
        label: "ARTICHRON.ShieldType"
      })
    };
  }
}
