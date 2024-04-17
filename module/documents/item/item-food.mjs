import {QuantityField} from "../fields/quantity-field.mjs";
import {ItemSystemModel} from "./system-model.mjs";

export default class FoodData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new QuantityField()
    };
  }
}
