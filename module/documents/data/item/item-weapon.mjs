import {SYSTEM} from "../../../helpers/config.mjs";
import ArsenalData from "./_item-arsenal.mjs";

export default class WeaponData extends ArsenalData {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.StringField({
        options: SYSTEM.SPELL_TYPES,
        label: "ARTICHRON.WeaponType"
      })
    };
  }
}
