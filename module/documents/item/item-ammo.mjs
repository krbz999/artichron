import {CategoryField} from "../fields/category-field.mjs";
import {QuantityField} from "../fields/quantity-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class AmmunitionData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "consumables"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new QuantityField(),
      category: new CategoryField({
        label: "ARTICHRON.ItemProperty.AmmunitionType",
        choices: CONFIG.SYSTEM.AMMUNITION_TYPES
      })
    };
  }
}
