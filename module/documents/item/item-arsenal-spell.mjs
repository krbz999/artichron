import EffectBuffData from "../effect/system-model.mjs";
import ArsenalData from "./item-arsenal.mjs";

export default class SpellData extends ArsenalData {
  /**
   * Metadata for this datamodel.
   * @type {import("../../helpers/types.mjs").ItemSystemModelMetadata}
   */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    defaultWeight: 1,
    order: 30,
    type: "spell"
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema()
    };
  }
}
