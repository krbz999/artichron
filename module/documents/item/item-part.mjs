import ItemSystemModel from "./system-model.mjs";

const {SchemaField, StringField, NumberField} = foundry.data.fields;

export default class PartData extends ItemSystemModel {
  /** @override */
  static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
    inventorySection: "loot",
    type: "part",
    defaultWeight: 1
  }, {inplace: false}));

  /* -------------------------------------------------- */

  /** @override */
  static defineSchema() {
    return {
      ...super.defineSchema(),
      quantity: new SchemaField({
        value: new NumberField({initial: 1, min: 0, integer: true, nullable: true})
      }),
      category: new SchemaField({
        subtype: new StringField({
          required: true,
          initial: () => Object.keys(CONFIG.SYSTEM.PART_TYPES)[0],
          choices: CONFIG.SYSTEM.PART_TYPES
        })
      })
    };
  }

  /* -------------------------------------------------- */
  /*   Tooltips                                         */
  /* -------------------------------------------------- */

  /** @override */
  async _prepareTooltipContext() {
    const context = await super._prepareTooltipContext();
    context.subtitle = `${game.i18n.localize("TYPES.Item.part")}, ${CONFIG.SYSTEM.PART_TYPES[this.category.subtype].label}`;
    return context;
  }
}
