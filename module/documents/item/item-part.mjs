import {QuantityField} from "../fields/quantity-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class PartData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "loot"
  }, {inplace: false}));

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new QuantityField()
    };
  }
}
