import {ItemSystemModel} from "./system-model.mjs";

export default class ElixirData extends ItemSystemModel {
  /** @override */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      quantity: new fields.SchemaField({
        value: new fields.NumberField({min: 0, integer: true, initial: 1})
      }),
      usage: new fields.SchemaField({
        value: new fields.NumberField({integer: true, min: 0, initial: null}),
        max: new fields.StringField({initial: ""})
      })
    };
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this._prepareUsage();
  }

  /**
   * Prepare max usage of the elixir.
   */
  _prepareUsage() {
    const us = this.usage;
    if (us.max) us.max = artichron.utils.simplifyFormula(us.max, this.parent.getRollData());
  }
}
