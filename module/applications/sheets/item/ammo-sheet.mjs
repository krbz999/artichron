import PhysicalItemSheet from "./physical-item-sheet.mjs";

export default class AmmoSheet extends PhysicalItemSheet {
  /** @inheritdoc */
  static metadata = {
    excludeTabs: ["fusion", "advancements", "activities"],
  };
}
