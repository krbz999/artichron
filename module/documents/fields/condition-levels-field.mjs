const { NumberField } = foundry.data.fields;

export default class ConditionLevelsField extends foundry.abstract.DataModel {
  /** @override */
  static defineSchema() {
    const statuses = Object.values(CONFIG.SYSTEM.ITEM_ATTRIBUTES).reduce((acc, attr) => {
      if (attr.status) acc[attr.status] = new NumberField({
        required: false,
        integer: true,
        min: 1,
        initial: undefined,
      });
      return acc;
    }, {});
    return statuses;
  }

  /* -------------------------------------------------- */

  /** @override */
  static LOCALIZATION_PREFIXES = [
    "ARTICHRON.CONDITIONS",
  ];
}
