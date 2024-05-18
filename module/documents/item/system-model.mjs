import {FormulaField} from "../fields/formula-field.mjs";

const {SchemaField, HTMLField, NumberField} = foundry.data.fields;

export class ItemSystemModel extends foundry.abstract.TypeDataModel {
  /**
   * An object of metadata.
   * @type {object}
   */
  static metadata = Object.freeze({
    inventorySection: "",
    defaultIcon: "",
    fusion: false
  });

  /** @override */
  static defineSchema() {
    return {
      description: new SchemaField({
        value: new HTMLField({label: "ARTICHRON.ItemProperty.DescriptionValue", required: true})
      }),
      weight: new SchemaField({
        value: new NumberField({min: 0, nullable: true, step: 0.25, label: "ARTICHRON.ItemProperty.Weight"})
      }),
      price: new SchemaField({
        value: new FormulaField({required: true, label: "ARTICHRON.ItemProperty.Price"})
      })
    };
  }

  /* ---------------------------------------- */
  /*              Event Handlers              */
  /* ---------------------------------------- */

  async _preCreate(data, options, user) {
    if (!data.img) this.parent.updateSource({img: this.constructor.metadata.defaultIcon});
    return super._preCreate(data, options, user);
  }

  /* ---------------------------------------- */
  /*               Item Methods               */
  /* ---------------------------------------- */

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
    this.weight.total = this.weight.value * (this.quantity?.value ?? 1);
    if (!this.parent.isEmbedded) this.preparePostData();
  }

  /**
   * Preparation method for any data that depends on prepared actor data. Called after all data
   * preparation if the item is owned, otherwise at the end of `prepareDerivedData`.
   */
  preparePostData() {}
}
