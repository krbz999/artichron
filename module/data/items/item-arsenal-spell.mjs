import ArsenalData from "./item-arsenal.mjs";

export default class SpellData extends ArsenalData {
  /** @inheritdoc */
  static get metadata() {
    return foundry.utils.mergeObject(super.metadata, {
      defaultWeight: 1,
      order: 30,
      type: "spell",
    });
  }
}
