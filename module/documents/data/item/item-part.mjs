import {BaseItemModel} from "./_item-base.mjs";

export default class MonsterPartData extends BaseItemModel {
  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      type: new foundry.data.fields.StringField({
        options: SYSTEM.SHIELD_TYPES,
        label: "ARTICHRON.MonsterPartType"
      })
    };
  }
}
