import {FormulaField} from "../fields/formula-field.mjs";

const {SchemaField, HTMLField, StringField} = foundry.data.fields;

export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /** @override */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({label: "ARTICHRON.ItemProperty.DescriptionValue", required: true})
      }),
      weight: new SchemaField({
        value: new FormulaField({required: true, label: "ARTICHRON.ItemProperty.Weight"})
      }),
      price: new SchemaField({
        value: new FormulaField({required: true, label: "ARTICHRON.ItemProperty.Price"})
      }),
      category: new SchemaField({
        subtype: new StringField({required: true, label: "ARTICHRON.ItemProperty.Subtype"})
      })
    };
  }

  /**
   * Perform the item's type-specific main function.
   * @returns {Promise}
   */
  async use() {
    throw new Error("Subclasses of the Item System Data Model must override the #use method.");
  }

  /**
   * Properties that can be amplified by a fused item.
   * @type {Set<string>}
   */
  get BONUS_FIELDS() {
    return new Set([
      "name",
      "img",
      "system.price.value",
      "system.weight.value"
    ]);
  }

  /**
   * Retrieve an object for roll data.
   * @returns {object}
   */
  getRollData() {
    return {...this};
  }

  /** @override */
  prepareDerivedData() {
    if (!this.parent.isEmbedded) this.preparePostData();
  }

  /**
   * Preparation method for any data that depends on prepared actor data. Called after all data
   * preparation if the item is owned, otherwise at the end of `prepareDerivedData`.
   */
  preparePostData() {}

  /**
   * The total weight of this stack of an item.
   * @type {number}
   */
  get totalWeight() {
    const rollData = this.parent.getRollData();
    const w = artichron.utils.simplifyBonus(this.weight.value, rollData);
    const q = ("quantity" in this) ? this.quantity.value : 1;
    return Math.max(0, w) * q;
  }
}
