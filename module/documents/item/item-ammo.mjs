import {CategoryField} from "../fields/category-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class AmmunitionData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      category: new CategoryField({
        label: "ARTICHRON.ItemProperty.AmmunitionType",
        choices: CONFIG.SYSTEM.AMMUNITION_TYPES
      })
    };
  }
}
