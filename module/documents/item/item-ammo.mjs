import {ItemSystemModel} from "./system-model.mjs";

export default class AmmunitionData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
